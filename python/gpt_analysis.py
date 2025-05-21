import sys
import json
import os
import base64
from openai import OpenAI

def main():
    try:
        # Read input data from stdin
        input_data = json.loads(sys.stdin.read())
        image_data = input_data.get('image', '')
        model_results = input_data.get('modelResults', {})
        api_key = input_data.get('api_key', '')
        
        if not api_key:
            print(json.dumps({"error": "OpenAI API key is required"}))
            sys.exit(1)
            
        # Get the predicted tumor type from model results
        predicted_class = model_results.get('predictedClass', 'unknown')
        confidence = model_results.get('confidence', 0)
        
        # Convert base64 image to a format OpenAI can use
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Create image URL from base64
        image_url = f"data:image/jpeg;base64,{image_data}"
        
        # Initialize the OpenAI client
        client = OpenAI(api_key=api_key)

        # Function to generate a report from an image URL
        def generate_report_with_image(image_url, tumor_type):

            res=report_template = f"""
            🧠 **MRI Report**  

            1. **Findings**  
            - Describe visible anomalies or normal structures.  
            - Mention the location, size, and shape of any mass or lesion.  
            - Note any signs of edema, contrast enhancement, or mass effect.  

            2. **Structural Observations**  
            - Evaluate ventricular size and symmetry.  
            - Identify any midline shift.  
            - Assess the integrity of surrounding tissues and brain structures.  

            3. **Contrast/Signal Characteristics**  
            - Describe T1/T2 signal intensity.  
            - Identify the presence of necrosis or hemorrhage.  
            - Note enhancement patterns post-contrast (if applicable).  

            **📝 Summary:**  
            Provide a concise summary of key findings in 1–2 sentences.  

            ---

            🔍 **Possible Diagnosis**  

            - **AI Model Prediction:**  
            - Predicted tumor type: **{tumor_type}**  
            - Confidence level: **{confidence*100:.1f}%**  

            - **Other Possible Diagnoses:**  
            - List differential diagnoses based on imaging findings.  
            - State whether you agree with the AI model’s prediction and explain why.  

            ---

            🧪 **Recommended Next Steps**  

            - Additional imaging (e.g., contrast-enhanced MRI, MR spectroscopy).  
            - Biopsy or histopathological examination for confirmation.  
            - Consultation with a neuro-oncology specialist.  
            - Treatment considerations (surgery, radiation, chemotherapy).  
            """


            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Use a vision-capable model
                messages=[
                    {"role": "system", "content": "You are a medical imaging expert specializing in brain MRI analysis."},
                    {"role": "user", "content": [
                        {"type": "text", "text": res },#f"Analyze this image and generate a detailed report with the following structure:\n\nMRI Report:\n- Provide a numbered list (1, 2, 3, etc.) with subsections describing the MRI findings based on the image.\n- Include an overall summary at the end of this section.\n\nPossible Diagnosis:\n- The AI model predicted this as: {tumor_type} with {confidence*100:.1f}% confidence.\n- List potential diagnoses based on the image and whether you agree with the AI model's prediction.\n\nRecommended Next Steps:\n- Provide steps like imaging, biopsy, or treatment options.\n\nConclusion:\n- Summarize findings and suggest further evaluation.\n\nThe possible classes are: glioma, meningioma, notumor, pituitary."},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]}
                ],
                max_tokens=1000
            )
            
            return response.choices[0].message.content

        # Generate the report
        report = generate_report_with_image(image_url, predicted_class)
        
        # Return the analysis
        output = {
            'analysis': report
        }
        
        print(json.dumps(output))
        sys.stdout.flush()
        
    except Exception as e:
        error_msg = f"Error generating GPT analysis: {str(e)}"
        print(json.dumps({"error": error_msg}))
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()