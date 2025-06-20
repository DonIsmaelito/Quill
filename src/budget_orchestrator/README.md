# Budget-Aware Medical Form Filling System

A reinforcement learning system that intelligently fills medical forms using Q-learning while respecting budget and time constraints. The system learns to optimally select from 5 different tools to complete form fields efficiently.

## Overview

This system uses Q-learning to train an agent that can automatically fill medical forms by choosing the most appropriate action for each field. The agent learns to balance completion accuracy, cost efficiency, and time constraints.

### Key Features

- **5 Core Actions**: Document extraction, information retrieval, user interaction, smart autofill, and skip
- **Budget Constraints**: Operates within $0.02 per form budget
- **Real Dataset Support**: Trains on actual medical form images and annotations
- **Smart Decision Making**: Learns optimal tool selection based on field type, context, and constraints
- **Multi-field Extraction**: Can extract multiple related fields from single operations

## System Architecture

### Core Components

1. **Q-Learning Agent** (`agents/qlearning_agent.py`)

   - Makes intelligent tool selection decisions
   - Learns from 1.55M state space
   - Adapts exploration strategy based on medical field criticality

2. **Form Environment** (`env/form_env.py`)

   - Simulates medical form filling process
   - Manages budget and latency constraints
   - Provides state observations and rewards

3. **Tool System** (`tools/`)

   - `extract_from_document.py`: OCR and pattern matching for form images
   - `information_retrieval_tool.py`: Retrieves known user information
   - `ask_user_tool.py`: Intelligent user interaction for missing data
   - `smart_autofill_tool.py`: Validates and formats extracted data
   - Skip action handled directly in environment

4. **Dataset Loader** (`form_dataset_loader.py`)
   - Loads real medical form images and annotations
   - Provides ground truth for training and evaluation

## Installation and Setup

### Prerequisites

```bash
# Required Python packages
pip install numpy opencv-python pillow pytesseract gymnasium
pip install PyPDF2 PyMuPDF  # For PDF processing
```

### System Requirements

- Python 3.8+
- OpenCV for image processing
- Tesseract OCR engine
- At least 4GB RAM for training (ran out of AWS)

 **Install Dependencies**

   ```bash
   pip install -r requirements.txt 
   ```

## Quick Start

### Training

```bash
# Train the Q-learning agent with default settings
python train_qlearn.py
```

### Custom Configuration

```bash
# Train with custom parameters
python train_qlearn.py --episodes 5000 --learning_rate 0.1 --epsilon_decay 0.995
```

## Usage Guide

### Training Process

1. **Start Training**

   ```bash
   python train_qlearn.py
   ```

2. **Monitor Progress**

   - Training logs show episode rewards, completion rates, and costs
   - Progress saved every 100 episodes
   - Q-table grows as agent explores state space

3. **Training Output**
   - Final model: `models/budget_orchestrator_agent_final.pkl`
   - Training results: `models/budget_orchestrator_agent_results.json`
   - Checkpoints: `models/budget_orchestrator_agent_checkpoint_*.pkl`

## Configuration

### Key Parameters (`config.py`)

- **Budget Constraints**

  - `MAX_BUDGET_PER_FORM = 0.02` # Maximum cost per form
  - `MAX_LATENCY_PER_FORM = 30.0` # Maximum time per form

- **Q-Learning Settings**

  - `LEARNING_RATE = 0.1`
  - `DISCOUNT_FACTOR = 0.95`
  - `EPSILON_START = 1.0` # Initial exploration
  - `EPSILON_END = 0.01` # Final exploration

- **Tool Costs**
  - Document extraction: $0.00005
  - Information retrieval: $0.0002
  - Ask user: $0.0003
  - Smart autofill: $0.00008
  - Skip: $0.00

### Medical Field Priorities

Fields are prioritized by medical importance:

- **Critical** (10.0): Medications
- **High** (5.0): SSN, Insurance ID
- **Medium** (3.0): Dates, Medical conditions
- **Low** (1.0-2.0): Contact information

## Dataset Structure

### Real Medical Forms

```
training/dataset_forms/
├── training_data/
│   ├── images/           # Form images (.png)
│   └── annotations/      # Field annotations (.json)
└── testing_data/
    ├── images/
    └── annotations/
```

### Annotation Format

```json
{
  "form": [
    {
      "id": "field_1",
      "label": "question",
      "text": "Patient Name:",
      "box": [x, y, width, height],
      "linking": [["field_1", "field_2"]]
    },
    {
      "id": "field_2",
      "label": "answer",
      "text": "John Doe",
      "box": [x, y, width, height]
    }
  ]
}
```

## System Performance

### Expected Results

- **Completion Rate**: ~14% (this is with using actual .png images from a real dataset)
- **Average Cost**: $0.020 per form
- **Episode Length**: ~3,243 steps
- **Reward**: ~674 per episode

### Performance Metrics

- Budget compliance rate
- Field completion accuracy
- Tool usage distribution
- Multi-field extraction efficiency

## File Structure

```
src/budget_orchestrator/
├── README.md                    # This file
├── config.py                    # System configuration
├── train_qlearn.py             # Main training script
├── eval.py                     # Evaluation script
├── utils.py                    # Utility functions
├── form_dataset_loader.py      # Real dataset handling
├── agents/
│   └── qlearning_agent.py      # Q-learning implementation
├── env/
│   └── form_env.py             # Form filling environment
└── tools/
    ├── __init__.py             # Tool management
    ├── document_extraction_tool.py
    ├── information_retrieval_tool.py
    ├── ask_user_tool.py
    └── smart_autofill_tool.py
```