import os
from template_generator import DocumentTemplateGenerator

def create_template_from_form_fields():
    generator = DocumentTemplateGenerator(output_dir="./templates")
    document_path = "path/to/your/form.pdf"
    
    fields_to_remove = [
        "Full Name:",
        "Date of Birth:",
        "Social Security Number:"
    ]
    
    print("Creating template...")
    template_path, metadata = generator.create_template_from_form_fields(document_path, fields_to_remove)
    
    print(f"\nTemplate created successfully!")
    print(f"Template saved to: {template_path}")
    
    print("\nRemoved form fields:")
    for field in metadata['removed_fields']:
        print(f"- {field['field_label']} (Page {field['page']}, Line {field['line']})")

if __name__ == "__main__":
    create_template_from_form_fields() 