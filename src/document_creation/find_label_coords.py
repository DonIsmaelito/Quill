import pytesseract
from PIL import Image, ImageEnhance
import logging
import unicodedata

def normalize_text(text):
    """
    Normalize text by converting to lowercase, removing extra spaces,
    and normalizing unicode characters
    """
    if not text:
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove special characters except numbers and letters
    text = ''.join(c for c in text if c.isalnum() or c.isspace())
    # Normalize unicode characters
    text = unicodedata.normalize('NFKD', text)
    # Remove extra spaces
    text = ' '.join(text.split())
    return text

def find_label_coords(img_path, field_labels):
    """
    Find the coordinates of field labels in an image.
    
    Args:
        img_path: Path to the image file
        field_labels: List of field label strings to search for
    
    Returns:
        Tuple of (lost_keys, label_coords) where:
            lost_keys: List of field labels that couldn't be found
            label_coords: Dictionary mapping found field labels to their coordinates
    """
    try:
        # Extract text and bounding box data from the image
        image = Image.open(img_path)
        
        # Convert to grayscale for better OCR
        image = image.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Extract text with custom configuration
        custom_config = r'--oem 3 --psm 11'
        ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config=custom_config)
        
        # Create a normalized version of field labels for case-insensitive matching
        normalized_field_labels = [normalize_text(label) for label in field_labels]
        
        # Build a mapping of original labels to normalized labels
        label_mapping = {normalize_text(label): label for label in field_labels}
        
        # Extract words and their bounding boxes with lower confidence threshold
        words = ocr_data['text']
        word_boxes = []
        for i in range(len(words)):
            if int(ocr_data['conf'][i]) > 30:  # Lower confidence threshold
                x, y, w, h = (
                    ocr_data['left'][i],
                    ocr_data['top'][i],
                    ocr_data['width'][i],
                    ocr_data['height'][i]
                )
                if words[i].strip():  # Only add non-empty words
                    word_boxes.append((normalize_text(words[i]), (x, y, w, h)))
        
        # Find matches for each field label
        label_coords = {}
        lost_keys = []
        
        for norm_label in normalized_field_labels:
            original_label = label_mapping[norm_label]
            found = False
            
            # Try to find exact matches first
            for word, (x, y, w, h) in word_boxes:
                if norm_label == word:
                    label_coords[original_label] = (x, y)
                    found = True
                    break
            
            # If no exact match, try partial matches
            if not found:
                label_words = norm_label.split()
                for i in range(len(word_boxes) - len(label_words) + 1):
                    match = True
                    matched_words = []
                    for j in range(len(label_words)):
                        if i + j < len(word_boxes):
                            matched_words.append(word_boxes[i + j][0])
                    
                    if ' '.join(matched_words) == ' '.join(label_words):
                        x, y, _, _ = word_boxes[i][1]
                        label_coords[original_label] = (x, y)
                        found = True
                        break
            
            if not found:
                lost_keys.append(original_label)
        
        print(f"Found {len(label_coords)} labels, missing {len(lost_keys)} labels")
        print(f"Found labels: {list(label_coords.keys())}")
        print(f"Missing labels: {lost_keys}")
        
        return lost_keys, label_coords
    
    except Exception as e:
        logging.error(f"Error in find_label_coords: {e}")
        return field_labels, {}

def main():
    image_path = "W-2.png"
    phrases = ["Employee's social security number", "Employer identification number", 
               "Wages, tips, other compensation"]
    coords = find_label_coords(image_path, phrases)

if __name__ == "__main__":
    main()
