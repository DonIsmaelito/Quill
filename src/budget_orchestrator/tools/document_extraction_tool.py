# Enhanced Document Extraction Tool
# Combines OCR, field analysis, and document quality assessment

import re
import cv2
import numpy as np
from PIL import Image
import pytesseract
from typing import Dict, Any, List, Optional, Tuple
import json
import os
import sys
from pathlib import Path

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

try:
    from config import FIELD_TYPES, FIELD_CRITICALITY
except ImportError:
    # Fallback values if config not available
    FIELD_TYPES = ['name', 'date', 'ssn', 'phone', 'email', 'address', 'insurance_id', 'medical_condition', 'medication']
    FIELD_CRITICALITY = {
        'name': 2.0, 'date': 3.0, 'ssn': 5.0, 'phone': 1.0, 'email': 1.0,
        'address': 2.0, 'insurance_id': 4.0, 'medical_condition': 8.0, 'medication': 10.0
    }

class DocumentExtractionTool:
    
    # Initialize extraction tool with OCR and pattern matching capabilities
    def __init__(self, context=None):
        self.context = context
        self.confidence_threshold = 0.7
        self.field_patterns = self.initialize_field_patterns()
        
    # Set up regex patterns for different medical field types
    def initialize_field_patterns(self) -> Dict[str, List[str]]:
        return {
            'ssn': [
                r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
                r'SS[N#]?\s*:?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4})',
                r'Social\s+Security\s*:?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4})'
            ],
            'phone': [
                r'\b\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b',
                r'Phone\s*:?\s*(\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4}))',
                r'Tel\s*:?\s*(\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4}))'
            ],
            'date': [
                r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b',
                r'\b(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})\b',
                r'Date\s*:?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
                r'DOB\s*:?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'
            ],
            'email': [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                r'Email\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})'
            ],
            'name': [
                r'Name\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'Patient\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'First\s+Name\s*:?\s*([A-Z][a-z]+)',
                r'Last\s+Name\s*:?\s*([A-Z][a-z]+)'
            ],
            'address': [
                r'Address\s*:?\s*(.*(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard).*)',
                r'\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard)'
            ],
            'insurance_id': [
                r'Insurance\s*ID\s*:?\s*([A-Z0-9\-]+)',
                r'Policy\s*#?\s*:?\s*([A-Z0-9\-]+)',
                r'Member\s*ID\s*:?\s*([A-Z0-9\-]+)'
            ],
            'medical_condition': [
                r'Diagnosis\s*:?\s*(.*)',
                r'Condition\s*:?\s*(.*)',
                r'Medical\s+History\s*:?\s*(.*)'
            ],
            'medication': [
                r'Medication\s*:?\s*(.*)',
                r'Prescription\s*:?\s*(.*)',
                r'Drug\s*:?\s*(.*)',
                r'Rx\s*:?\s*(.*)'
            ]
        }
    
    # Extract field value from documents using OCR and pattern matching
    def execute(self, field_id: str, field_type: str, documents: List[str] = None, 
                context: Dict = None) -> Dict[str, Any]:
        try:
            if not documents:
                return {
                    'success': False,
                    'error': 'No documents provided',
                    'confidence': 0.0,
                    'extracted_values': [],
                    'document_quality': 'unknown'
                }
            
            all_extractions = []
            best_confidence = 0.0
            best_value = None
            overall_quality = 'poor'
            
            # Process each document
            for doc_path in documents:
                if not os.path.exists(doc_path):
                    continue
                
                extracted_text, doc_quality = self.extract_text_with_quality(doc_path)
                
                if not extracted_text:
                    continue
                
                # Update quality assessment
                if doc_quality == 'good' and overall_quality != 'good':
                    overall_quality = 'good'
                elif doc_quality == 'fair' and overall_quality == 'poor':
                    overall_quality = 'fair'
                
                field_values = self.extract_field_values(
                    extracted_text, field_type, field_id
                )
                
                if not field_values:
                    continue
                
                # Add document context to each extraction
                for value_info in field_values:
                    value_info['source_document'] = doc_path
                    value_info['document_quality'] = doc_quality
                    all_extractions.append(value_info)
                    
                    if value_info['confidence'] > best_confidence:
                        best_confidence = value_info['confidence']
                        best_value = value_info['value']
            
            ranked_extractions = self.rank_extractions(all_extractions, field_type)
            
            success = best_confidence >= self.confidence_threshold and best_value is not None
            
            return {
                'success': success,
                'value': best_value if success else None,
                'confidence': best_confidence,
                'extracted_values': ranked_extractions[:3],  # Top 3 candidates
                'document_quality': overall_quality,
                'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
                'extraction_method': 'ocr_pattern_matching',
                'processed_documents': len(documents)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.0,
                'extracted_values': [],
                'document_quality': 'error'
            }
    
    # Extract text from document and assess quality
    def extract_text_with_quality(self, doc_path: str) -> Tuple[str, str]:
        try:
            if doc_path.lower().endswith('.pdf'):
                return self.extract_pdf_text(doc_path)
            else:
                return self.extract_image_text(doc_path)
        except Exception as e:
            return "", "poor"
    
    # Extract text from PDF with quality assessment
    def extract_pdf_text(self, pdf_path: str) -> Tuple[str, str]:
        try:
            import PyPDF2
            import fitz  # PyMuPDF for better OCR
            
            # Try text extraction first (faster)
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
            
            if len(text.strip()) > 50:  # Reasonable amount of text extracted
                return text, 'good'
            
            # Fallback to OCR if text extraction failed
            doc = fitz.open(pdf_path)
            ocr_text = ""
            total_confidence = 0
            page_count = 0
            
            for page_num in range(min(5, len(doc))):  # Process max 5 pages
                page = doc.load_page(page_num)
                pix = page.get_pixmap()
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # OCR with confidence
                ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                page_text = " ".join([word for word, conf in zip(ocr_data['text'], ocr_data['conf']) if conf > 30])
                ocr_text += page_text + "\n"
                
                # Calculate average confidence
                confidences = [c for c in ocr_data['conf'] if c > 0]
                if confidences:
                    total_confidence += sum(confidences) / len(confidences)
                    page_count += 1
            
            doc.close()
            
            # Assess quality based on OCR confidence
            avg_confidence = total_confidence / page_count if page_count > 0 else 0
            quality = 'good' if avg_confidence > 70 else 'fair' if avg_confidence > 40 else 'poor'
            
            return ocr_text, quality
            
        except Exception as e:
            return f"PDF extraction error: {str(e)}", 'poor'
    
    # Extract text from image with quality assessment
    def extract_image_text(self, image_path: str) -> Tuple[str, str]:
        try:
            # Load and preprocess image
            image = cv2.imread(image_path)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Image enhancement for better OCR
            gray = cv2.medianBlur(gray, 3)
            gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # OCR with confidence data
            ocr_data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
            
            # Extract text and calculate confidence
            words = []
            confidences = []
            for i, conf in enumerate(ocr_data['conf']):
                if conf > 30:  # Filter low-confidence detections
                    word = ocr_data['text'][i].strip()
                    if word:
                        words.append(word)
                        confidences.append(conf)
            
            text = " ".join(words)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Assess quality
            quality = 'good' if avg_confidence > 70 else 'fair' if avg_confidence > 40 else 'poor'
            
            return text, quality
            
        except Exception as e:
            return f"Image extraction error: {str(e)}", 'poor'
    
    # Extract field values using pattern matching
    def extract_field_values(self, text: str, field_type: str, field_id: str) -> List[Dict[str, Any]]:
        extractions = []
        
        if field_type not in self.field_patterns:
            # Generic text search for unknown field types
            lines = text.split('\n')
            for line in lines:
                if field_id.lower().replace('_', ' ') in line.lower():
                    # Extract value after colon or similar
                    parts = re.split(r'[:=]\s*', line, 1)
                    if len(parts) > 1:
                        value = parts[1].strip()
                        if value:
                            extractions.append({
                                'value': value,
                                'confidence': 0.6,
                                'pattern': 'generic_field_match',
                                'context': line
                            })
            return extractions
        
        # Use specific patterns for known field types
        patterns = self.field_patterns[field_type]
        
        for i, pattern in enumerate(patterns):
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            
            for match in matches:
                # Extract the main value (last group or full match)
                if match.groups():
                    value = match.groups()[-1].strip()
                else:
                    value = match.group(0).strip()
                
                if value:
                    # Calculate confidence based on pattern strength and context
                    confidence = self.calculate_extraction_confidence(
                        value, field_type, match, text
                    )
                    
                    extractions.append({
                        'value': value,
                        'confidence': confidence,
                        'pattern': pattern,
                        'position': match.start(),
                        'context': self.get_match_context(text, match.start(), match.end())
                    })
        
        return extractions
    
    # Calculate extraction confidence based on pattern strength and context
    def calculate_extraction_confidence(self, value: str, field_type: str,
                                      match: Any, full_text: str) -> float:
        base_confidence = 0.8 - (int(match.pattern.split('_')[-1]) * 0.1)  # Earlier patterns are more specific
        
        # Field-specific validation
        if field_type == 'ssn':
            if re.match(r'^\d{3}-?\d{2}-?\d{4}$', value.replace(' ', '')):
                return min(0.95, base_confidence + 0.15)
        elif field_type == 'phone':
            digits = re.sub(r'[^\d]', '', value)
            if len(digits) == 10:
                return min(0.95, base_confidence + 0.15)
        elif field_type == 'email':
            if '@' in value and '.' in value.split('@')[-1]:
                return min(0.95, base_confidence + 0.15)
        elif field_type == 'date':
            # Basic date format validation
            if re.match(r'^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$', value):
                return min(0.90, base_confidence + 0.1)
        
        # Context-based confidence adjustment
        context = self.get_match_context(full_text, match.start(), match.end())
        if any(word in context.lower() for word in ['form', 'patient', 'medical']):
            base_confidence += 0.05
        
        return max(0.1, min(0.95, base_confidence))
    
    # Get context around a match for confidence assessment
    def get_match_context(self, text: str, start: int, end: int, window: int = 50) -> str:
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        return text[context_start:context_end]
    
    # Rank extractions by confidence and relevance
    def rank_extractions(self, extractions: List[Dict[str, Any]], field_type: str) -> List[Dict[str, Any]]:
        # Sort by confidence, then by pattern specificity
        ranked = sorted(extractions, key=lambda x: x['confidence'], reverse=True)
        
        # Apply field-specific ranking rules
        for extraction in ranked:
            # Normalize value for comparison
            normalized_value = self.normalize_value(extraction['value'], field_type)
            extraction['normalized_value'] = normalized_value
        
        # Remove duplicates based on normalized values
        unique_extractions = []
        seen_values = set()
        
        for extraction in ranked:
            normalized = extraction['normalized_value']
            if normalized not in seen_values:
                unique_extractions.append(extraction)
                seen_values.add(normalized)
        
        return unique_extractions
    
    # Normalize extracted value for comparison and validation
    def normalize_value(self, value: str, field_type: str) -> str:
        if field_type == 'ssn':
            return re.sub(r'[^\d]', '', value)
        elif field_type == 'phone':
            return re.sub(r'[^\d]', '', value)
        elif field_type == 'email':
            return value.lower().strip()
        else:
            return value.strip().lower()

    # Extract field value from real form image using ground truth annotations
    def execute_from_form_image(self, field_info: Dict[str, Any], image_path: str = None, 
                               image_data: np.ndarray = None) -> Dict[str, Any]:
        try:
            # For real dataset training, we have ground truth values
            if 'ground_truth' in field_info and field_info['ground_truth']:
                # Simulate realistic extraction with some noise
                ground_truth = field_info['ground_truth']
                confidence = field_info.get('ground_truth_confidence', 0.95)
                
                # Add some realistic OCR noise occasionally
                import random
                if random.random() < 0.1:  # 10% chance of OCR error
                    confidence *= 0.7
                    # Could add character substitution errors here
                
                return {
                    'success': True,
                    'value': ground_truth,
                    'confidence': confidence,
                    'extracted_values': [{
                        'value': ground_truth,
                        'confidence': confidence,
                        'pattern': 'ground_truth',
                        'context': f"Real form field: {field_info.get('question', '')}",
                        'source_document': image_path or 'real_form_image'
                    }],
                    'document_quality': self.assess_image_quality(image_path, image_data),
                    'field_criticality': FIELD_CRITICALITY.get(field_info.get('field_type', 'other'), 1.0),
                    'extraction_method': 'ground_truth_with_noise',
                    'processed_documents': 1,
                    'source_context': f'Field {field_info["id"]} from real form',
                    'cost': 0.00005,  # OCR cost
                    'latency': 2.0,  # Faster for ground truth
                    'original_field_info': field_info
                }
            
            # Fallback to actual OCR if no ground truth
            if image_path:
                return self.execute(field_info.get('name', ''), 
                                  field_info.get('type', 'other'), 
                                  [image_path])
            elif image_data is not None:
                # Save temporary image and process
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    cv2.imwrite(tmp.name, image_data)
                    result = self.execute(field_info.get('name', ''), 
                                        field_info.get('type', 'other'), 
                                        [tmp.name])
                    os.unlink(tmp.name)
                    return result
            
            return {
                'success': False,
                'error': 'No image data or path provided',
                'confidence': 0.0,
                'extracted_values': [],
                'document_quality': 'unknown'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.0,
                'extracted_values': [],
                'document_quality': 'error',
                'cost': 0.00005,
                'latency': 1.0
            }
    
    # Assess quality of image document for extraction confidence
    def assess_image_quality(self, image_path: str = None, image_data: np.ndarray = None) -> str:
        try:
            if image_data is not None:
                image = image_data
            elif image_path and os.path.exists(image_path):
                image = cv2.imread(image_path)
            else:
                return 'unknown'
            
            if image is None:
                return 'poor'
            
            height, width = image.shape[:2]
            
            # Resolution-based quality assessment
            total_pixels = height * width
            if total_pixels > 1000000:  # High resolution
                return 'good'
            elif total_pixels > 300000:  # Medium resolution
                return 'fair'
            else:
                return 'poor'
                
        except Exception:
            return 'poor'


class DocumentExtractionToolStub:
    
    # Stub implementation for testing
    def __init__(self, context=None):
        self.context = context
    
    # Stub implementation returns mock extraction results
    def execute(self, field_id: str, field_type: str, documents: List[str] = None, 
                context: Dict = None) -> Dict[str, Any]:
        
        # Mock values based on field type
        mock_values = {
            'name': 'John Doe',
            'ssn': '123-45-6789',
            'phone': '(555) 123-4567',
            'email': 'john.doe@email.com',
            'date': '01/15/1990',
            'address': '123 Main St, City, ST 12345',
            'insurance_id': 'INS123456',
            'medical_condition': 'Hypertension',
            'medication': 'Lisinopril 10mg',
        }
        
        mock_value = mock_values.get(field_type, f"Mock {field_type} value")
        
        return {
            'success': True,
            'value': mock_value,
            'confidence': 0.85,
            'extracted_values': [
                {
                    'value': mock_value,
                    'confidence': 0.85,
                    'pattern': 'mock_pattern',
                    'context': f"Mock context for {field_type}",
                    'source_document': 'mock_document.pdf'
                }
            ],
            'document_quality': 'good',
            'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
            'extraction_method': 'mock_extraction',
            'processed_documents': len(documents) if documents else 1
        } 