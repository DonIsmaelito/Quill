import os
import logging
from typing import List, Dict, Tuple, Optional
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import re
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DocumentTemplateGenerator:
    def __init__(self, output_dir: str = "./templates"):
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
    def extract_text_from_document(self, document_path: str) -> List[str]:
        try:
            images = convert_from_path(document_path, dpi=300)
            logger.info(f"Converted document to {len(images)} images")
            
            text_content = []
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1} with OCR")
                text = pytesseract.image_to_string(image)
                text_content.append(text)
                
            return text_content
            
        except Exception as e:
            logger.error(f"Error processing document with OCR: {e}")
            raise

    def identify_variables(self, text: str) -> List[Dict[str, any]]:
        variables = []
        
        patterns = [
            r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}',
            r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',
            r'\d{3}[-.]?\d{2}[-.]?\d{4}',
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*',
            r'\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)',
            r'\$[\d,]+(?:\.\d{2})?',
            r'\b\d{5}(?:-\d{4})?\b'
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                variables.append({
                    'text': match.group(),
                    'start': match.start(),
                    'end': match.end(),
                    'type': self._get_variable_type(pattern),
                    'line': self._get_line_number(text, match.start())
                })
        
        variables = self._remove_duplicates(variables)
        variables.sort(key=lambda x: (x['line'], x['start']))
        
        return variables

    def _get_variable_type(self, pattern: str) -> str:
        type_mapping = {
            r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}': 'date',
            r'\(\d{3}\)\s*\d{3}[-.]?\d{4}': 'phone',
            r'\d{3}[-.]?\d{2}[-.]?\d{4}': 'ssn',
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}': 'email',
            r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*': 'name',
            r'\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)': 'address',
            r'\$[\d,]+(?:\.\d{2})?': 'currency',
            r'\b\d{5}(?:-\d{4})?\b': 'zip'
        }
        return type_mapping.get(pattern, 'unknown')

    def _get_line_number(self, text: str, position: int) -> int:
        return text.count('\n', 0, position) + 1

    def _remove_duplicates(self, variables: List[Dict[str, any]]) -> List[Dict[str, any]]:
        seen = set()
        unique_vars = []
        
        for var in variables:
            key = (var['text'], var['start'], var['end'])
            if key not in seen:
                seen.add(key)
                unique_vars.append(var)
                
        return unique_vars

    def create_template(self, document_path: str, variables_to_remove: List[str]) -> Tuple[str, Dict]:
        text_content = self.extract_text_from_document(document_path)
        
        template_content = []
        removed_vars = []
        
        for page_num, text in enumerate(text_content):
            variables = self.identify_variables(text)
            
            template_text = text
            for var in variables:
                if var['text'] in variables_to_remove:
                    placeholder = f"{{{var['type']}_{len(removed_vars)}}}"
                    template_text = template_text[:var['start']] + placeholder + template_text[var['end']:]
                    removed_vars.append({
                        'original': var['text'],
                        'placeholder': placeholder,
                        'type': var['type'],
                        'page': page_num + 1,
                        'line': var['line']
                    })
            
            template_content.append(template_text)
        
        template_name = os.path.splitext(os.path.basename(document_path))[0] + "_template.txt"
        template_path = os.path.join(self.output_dir, template_name)
        
        with open(template_path, 'w') as f:
            f.write('\n\n'.join(template_content))
        
        metadata = {
            'original_document': document_path,
            'removed_variables': removed_vars,
            'template_path': template_path
        }
        
        metadata_path = os.path.join(self.output_dir, template_name + ".json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return template_path, metadata

    def get_available_variables(self, document_path: str) -> List[Dict[str, any]]:
        text_content = self.extract_text_from_document(document_path)
        all_variables = []
        
        for page_num, text in enumerate(text_content):
            variables = self.identify_variables(text)
            for var in variables:
                var['page'] = page_num + 1
                all_variables.append(var)
        
        return all_variables

    def create_template_from_fields(self, document_path: str, fields_to_remove: List[str]) -> Tuple[str, Dict]:
        text_content = self.extract_text_from_document(document_path)
        
        template_content = []
        removed_vars = []
        
        for page_num, text in enumerate(text_content):
            template_text = text
            
            for field in fields_to_remove:
                field_positions = [(m.start(), m.end()) for m in re.finditer(re.escape(field), template_text)]
                
                for start, end in reversed(field_positions):
                    field_type = self._detect_field_type(field)
                    
                    placeholder = f"{{{field_type}_{len(removed_vars)}}}"
                    
                    template_text = template_text[:start] + placeholder + template_text[end:]
                    
                    removed_vars.append({
                        'original': field,
                        'placeholder': placeholder,
                        'type': field_type,
                        'page': page_num + 1,
                        'line': self._get_line_number(text, start)
                    })
            
            template_content.append(template_text)
        
        template_name = os.path.splitext(os.path.basename(document_path))[0] + "_template.txt"
        template_path = os.path.join(self.output_dir, template_name)
        
        with open(template_path, 'w') as f:
            f.write('\n\n'.join(template_content))
        
        metadata = {
            'original_document': document_path,
            'removed_variables': removed_vars,
            'template_path': template_path
        }
        
        metadata_path = os.path.join(self.output_dir, template_name + ".json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return template_path, metadata

    def _detect_field_type(self, field: str) -> str:
        patterns = {
            'date': r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}',
            'phone': r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',
            'ssn': r'\d{3}[-.]?\d{2}[-.]?\d{4}',
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'name': r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*',
            'address': r'\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)',
            'currency': r'\$[\d,]+(?:\.\d{2})?',
            'zip': r'\b\d{5}(?:-\d{4})?\b'
        }
        
        for field_type, pattern in patterns.items():
            if re.match(pattern, field):
                return field_type
        return 'text'

    def create_template_from_form_fields(self, document_path: str, fields_to_remove: List[str]) -> Tuple[str, Dict]:
        text_content = self.extract_text_from_document(document_path)
        template_content = []
        removed_fields = []
        
        for page_num, text in enumerate(text_content):
            template_text = text
            
            for field in fields_to_remove:
                field_matches = list(re.finditer(f"{re.escape(field)}[\\s_:]*", template_text))
                
                for match in reversed(field_matches):
                    start, end = match.span()
                    while end < len(template_text) and template_text[end] in [' ', '_', '\n']:
                        end += 1
                        
                    removed_fields.append({
                        'field_label': field,
                        'page': page_num + 1,
                        'line': self._get_line_number(text, start)
                    })
                    
                    template_text = template_text[:start] + template_text[end:]
            
            template_content.append(template_text)
        
        template_name = os.path.splitext(os.path.basename(document_path))[0] + "_template.txt"
        template_path = os.path.join(self.output_dir, template_name)
        
        with open(template_path, 'w') as f:
            f.write('\n\n'.join(template_content))
        
        metadata = {
            'original_document': document_path,
            'removed_fields': removed_fields,
            'template_path': template_path
        }
        
        metadata_path = os.path.join(self.output_dir, template_name + ".json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return template_path, metadata