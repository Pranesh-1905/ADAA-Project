import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def chat_with_groq():
    """Interactive chat with Groq API using streaming responses."""
    
    # Initialize Groq client (it will automatically use GROQ_API_KEY from environment)
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    print("=== Groq Chat Interface ===")
    print("Type your message and press Enter. Type 'quit' or 'exit' to end.\n")
    
    while True:
        # Get user input
        user_input = input("You: ").strip()
        
        # Check if user wants to quit
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("\nGoodbye!")
            break
        
        # Skip empty inputs
        if not user_input:
            continue
        
        print("\nAssistant: ", end="", flush=True)
        
        try:
            # Create streaming completion
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "user",
                        "content": user_input
                    }
                ],
                temperature=1,
                max_completion_tokens=1024,
                top_p=1,
                stream=True,
                stop=None
            )
            
            # Stream the response in real-time
            for chunk in completion:
                if chunk.choices[0].delta.content:
                    print(chunk.choices[0].delta.content, end="", flush=True)
            
            print("\n")  # New line after response
            
        except Exception as e:
            print(f"\nError: {e}\n")

if __name__ == "__main__":
    chat_with_groq()
