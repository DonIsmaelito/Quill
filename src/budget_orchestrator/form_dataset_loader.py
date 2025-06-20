# Real medical form dataset loader that handles PNG images and JSON annotations for training the form-filling agent

import os
import json
import cv2
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path
import random

class FormSample:
    
    # Initialize form sample with paths to image and annotation files
    def __init__(self, image_path: str, annotation_path: str):
        self.image_path = image_path
        self.annotation_path = annotation_path
        self.sample_id = Path(image_path).stem
        
        # Lazy loading for memory efficiency
        self.image = None
        self.annotations = None
        self.form_fields = None
        self.question_answer_pairs = None
        
    # Load and return the form image from PNG file
    def load_image(self) -> np.ndarray:
        if self.image is None:
            self.image = cv2.imread(self.image_path)
            if self.image is None:
                raise ValueError(f"Could not load image from {self.image_path}")
        return self.image
    
    # Load and return the form annotations from JSON file
    def load_annotations(self) -> Dict[str, Any]:
        if self.annotations is None:
            with open(self.annotation_path, 'r', encoding='utf-8') as f:
                self.annotations = json.load(f)
        return self.annotations
    
    # Extract structured form fields with question-answer linking from annotations
    def get_form_fields(self) -> List[Dict[str, Any]]:
        if self.form_fields is None:
            annotations = self.load_annotations()
            self.form_fields = self.extract_form_fields(annotations)
        return self.form_fields
    
    # Extract simple question-answer pairs from annotations for basic processing
    def get_question_answer_pairs(self) -> List[Dict[str, Any]]:
        if self.question_answer_pairs is None:
            annotations = self.load_annotations()
            self.question_answer_pairs = self.extract_qa_pairs(annotations)
        return self.question_answer_pairs
    
    # Extract structured form fields from JSON annotations with proper linking
    def extract_form_fields(self, annotations: Dict[str, Any]) -> List[Dict[str, Any]]:
        form_entities = annotations.get('form', [])
        fields = []
        
        # Group entities by type for proper processing
        questions = {e['id']: e for e in form_entities if e.get('label') == 'question'}
        answers = {e['id']: e for e in form_entities if e.get('label') == 'answer'}
        
        # Process question-answer pairs with linking information
        for question_id, question in questions.items():
            # Find linked answers using the linking relationships
            linked_answers = []
            for link in question.get('linking', []):
                if len(link) == 2 and link[0] == question_id:
                    answer_id = link[1]
                    if answer_id in answers:
                        linked_answers.append(answers[answer_id])
            
            # Create structured field entry for training
            field = {
                'id': question_id,
                'question': question['text'].strip(),
                'question_box': question['box'],
                'answers': [ans['text'].strip() for ans in linked_answers],
                'answer_boxes': [ans['box'] for ans in linked_answers],
                'field_type': self.classify_field_type(question['text']),
                'required': True,  # Assume all fields are required for medical forms
                'confidence': 1.0,
                'extraction_method': 'ground_truth'
            }
            
            fields.append(field)
        
        return fields
    
    # Extract simple question-answer pairs without complex linking
    def extract_qa_pairs(self, annotations: Dict[str, Any]) -> List[Dict[str, Any]]:
        form_entities = annotations.get('form', [])
        qa_pairs = []
        
        questions = {e['id']: e for e in form_entities if e.get('label') == 'question'}
        answers = {e['id']: e for e in form_entities if e.get('label') == 'answer'}
        
        # Create simple question-answer pairs
        for question_id, question in questions.items():
            for link in question.get('linking', []):
                if len(link) == 2 and link[0] == question_id:
                    answer_id = link[1]
                    if answer_id in answers:
                        qa_pairs.append({
                            'question': question['text'].strip(),
                            'answer': answers[answer_id]['text'].strip(),
                            'question_box': question['box'],
                            'answer_box': answers[answer_id]['box']
                        })
        
        return qa_pairs
    
    # Classify field type based on question text for proper tool selection
    def classify_field_type(self, question_text: str) -> str:
        question_lower = question_text.lower()
        
        # Medical form field classification rules
        if any(keyword in question_lower for keyword in ['name', 'patient', 'first', 'last']):
            return 'name'
        elif any(keyword in question_lower for keyword in ['date', 'birth', 'dob', 'born']):
            return 'date'
        elif any(keyword in question_lower for keyword in ['ssn', 'social', 'security']):
            return 'ssn'
        elif any(keyword in question_lower for keyword in ['phone', 'telephone', 'mobile', 'cell']):
            return 'phone'
        elif any(keyword in question_lower for keyword in ['email', 'mail', '@']):
            return 'email'
        elif any(keyword in question_lower for keyword in ['address', 'street', 'city', 'state', 'zip']):
            return 'address'
        elif any(keyword in question_lower for keyword in ['insurance', 'policy', 'member', 'id']):
            return 'insurance_id'
        elif any(keyword in question_lower for keyword in ['condition', 'diagnosis', 'medical', 'health']):
            return 'medical_condition'
        elif any(keyword in question_lower for keyword in ['medication', 'drug', 'medicine', 'prescription']):
            return 'medication'
        elif any(keyword in question_lower for keyword in ['signature', 'sign']):
            return 'signature'
        elif any(keyword in question_lower for keyword in ['check', 'box', 'select']):
            return 'checkbox'
        else:
            return 'other'
    
    # Assess document quality based on image properties for training feedback
    def get_document_quality(self) -> str:
        image = self.load_image()
        
        # Quality assessment based on image resolution
        height, width = image.shape[:2]
        
        total_pixels = height * width
        if total_pixels < 100000:  # Low resolution
            return 'poor'
        elif total_pixels > 500000:  # High resolution
            return 'good'
        else:
            return 'fair'


class FormDatasetLoader:
    def __init__(self, dataset_root: str, split: str = 'training_data'):
        self.dataset_root = Path(dataset_root)
        self.split = split
        
        # Set paths
        self.split_dir = self.dataset_root / split
        self.images_dir = self.split_dir / 'images'
        self.annotations_dir = self.split_dir / 'annotations'
        
        # Validate paths
        if not self.split_dir.exists():
            raise FileNotFoundError(f"Split directory not found: {self.split_dir}")
        if not self.images_dir.exists():
            raise FileNotFoundError(f"Images directory not found: {self.images_dir}")
        if not self.annotations_dir.exists():
            raise FileNotFoundError(f"Annotations directory not found: {self.annotations_dir}")
        
        # Load sample list
        self.samples = self.load_sample_list()
        
    # Load list of available form samples from the dataset directory
    def load_sample_list(self) -> List[FormSample]:
        samples = []
        
        # Get all image files
        image_files = list(self.images_dir.glob('*.png'))
        
        for image_path in image_files:
            # Find corresponding annotation
            annotation_path = self.annotations_dir / f"{image_path.stem}.json"
            
            if annotation_path.exists():
                sample = FormSample(str(image_path), str(annotation_path))
                samples.append(sample)
            else:
                continue
        
        return samples
    
    def get_sample(self, index: int) -> FormSample:
        if index >= len(self.samples):
            raise IndexError(f"Sample index {index} out of range (max: {len(self.samples)-1})")
        return self.samples[index]
    
    def get_random_sample(self) -> FormSample:
        return random.choice(self.samples)
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __iter__(self):
        for sample in self.samples:
            yield sample
    
    def get_dataset_stats(self) -> Dict[str, Any]:
        total_samples = len(self.samples)
        
        # Sample a few forms to get statistics
        sample_size = min(10, total_samples)
        sampled_forms = random.sample(self.samples, sample_size)
        
        field_types = []
        total_fields = 0
        total_qa_pairs = 0
        
        for sample in sampled_forms:
            try:
                fields = sample.get_form_fields()
                qa_pairs = sample.get_question_answer_pairs()
                
                total_fields += len(fields)
                total_qa_pairs += len(qa_pairs)
                
                for field in fields:
                    field_types.append(field['field_type'])
            except Exception as e:
                continue
        
        # Calculate averages
        avg_fields = total_fields / sample_size if sample_size > 0 else 0
        avg_qa_pairs = total_qa_pairs / sample_size if sample_size > 0 else 0
        
        # Count field types
        field_type_counts = {}
        for field_type in field_types:
            field_type_counts[field_type] = field_type_counts.get(field_type, 0) + 1
        
        return {
            'total_samples': total_samples,
            'avg_fields_per_form': avg_fields,
            'avg_qa_pairs_per_form': avg_qa_pairs,
            'field_type_distribution': field_type_counts,
            'split': self.split
        }
    
    def prepare_training_batch(self, batch_size: int = 1) -> List[Dict[str, Any]]:
        batch = []
        
        for _ in range(batch_size):
            sample = self.get_random_sample()
            
            try:
                # Load sample data
                image = sample.load_image()
                fields = sample.get_form_fields()
                
                # Prepare training sample
                training_sample = {
                    'sample_id': sample.sample_id,
                    'image': image,
                    'form_fields': fields,
                    'document_quality': sample.get_document_quality(),
                    'image_path': sample.image_path,
                    'annotation_path': sample.annotation_path
                }
                
                batch.append(training_sample)
                
            except Exception as e:
                continue
        
        return batch


def create_data_loaders(dataset_root: str) -> Tuple[FormDatasetLoader, FormDatasetLoader]:
    train_loader = FormDatasetLoader(dataset_root, 'training_data')
    test_loader = FormDatasetLoader(dataset_root, 'testing_data')
    
    return train_loader, test_loader


# Example usage and testing
if __name__ == "__main__":
    # Test the data loader
    dataset_root = "training/dataset_forms"
    
    try:
        train_loader, test_loader = create_data_loaders(dataset_root)
        
        print("Training Data Stats:")
        train_stats = train_loader.get_dataset_stats()
        for key, value in train_stats.items():
            print(f"  {key}: {value}")
        
        print("\nTesting Data Stats:")
        test_stats = test_loader.get_dataset_stats()
        for key, value in test_stats.items():
            print(f"  {key}: {value}")
        
        # Test loading a sample
        print("\nTesting sample loading...")
        sample = train_loader.get_random_sample()
        print(f"Sample ID: {sample.sample_id}")
        
        fields = sample.get_form_fields()
        print(f"Number of fields: {len(fields)}")
        
        if fields:
            print("First field:")
            print(f"  Question: {fields[0]['question']}")
            print(f"  Answers: {fields[0]['answers']}")
            print(f"  Type: {fields[0]['field_type']}")
        
        print("Data loader test successful!")
        
    except Exception as e:
        print(f"Error testing data loader: {e}")
        import traceback
        traceback.print_exc() 