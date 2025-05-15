import subprocess
import os

def start_frontend():
    # Get the absolute path to npm
    npm_cmd = 'npm.cmd' if os.name == 'nt' else 'npm'  # Use npm.cmd for Windows
    
    # Get frontend directory path
    current_dir = os.getcwd()
    frontend_path = os.path.join(current_dir, 'src', 'frontend', 'quill')
    frontend_path = os.path.join(current_dir, 'mockups', 'frontend2')
    
    try:
        # Change to the frontend directory
        os.chdir(frontend_path)
        print(f"Starting Next.js development server in {frontend_path}...")
        
        # (NEW) Ensure dependencies are installed before running dev server
        node_modules_path = os.path.join(frontend_path, 'node_modules')
        if not os.path.isdir(node_modules_path):
            print("node_modules not found. Installing npm dependencies...")
            subprocess.run(
                f"{npm_cmd} install",
                shell=True,
                check=True,
                text=True
            )
        else:
            print("Dependencies already installed. Skipping npm install.")
        
        # Run npm run dev with shell=True for Windows
        process = subprocess.run(
            f"{npm_cmd} run dev",
            shell=True,
            check=True,
            text=True
        )
        
    except subprocess.CalledProcessError as e:
        print(f"Error running npm run dev: {e}")
    except FileNotFoundError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    start_frontend()