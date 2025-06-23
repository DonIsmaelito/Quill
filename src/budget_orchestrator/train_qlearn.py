# Main training orchestrator for Q-learning agent that learns to fill medical forms under budget constraints

import os
import sys
import numpy as np
import json
from typing import Dict, Any, List, Optional
import time
from collections import defaultdict

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from config import (
    NUM_EPISODES, LEARNING_RATE, DISCOUNT_FACTOR, EPSILON_START, EPSILON_END, EPSILON_DECAY,
    MAX_BUDGET_PER_FORM, MAX_LATENCY_PER_FORM, CORE_ACTIONS
)
from env.form_env import EnhancedFormFillingEnv, StateEncoder
from agents.qlearning_agent import QLearningAgent
from tools import ToolContext, KnowledgeBaseManager
from form_dataset_loader import create_data_loaders, FormDatasetLoader

# Orchestrates Q-learning training for medical form filling agent with real dataset integration
class EnhancedTrainingOrchestrator:
    # Initialize training orchestrator with configuration
    def __init__(self, config: Dict[str, Any] = None):
        self.config = self.get_default_config()
        if config:
            self.config.update(config)
            
        self.training_start_time = None
        self.training_results = {}
        
        self.setup_environment()
        self.setup_agent()
        self.setup_analytics()
    
    # Get default training configuration
    def get_default_config(self) -> Dict[str, Any]:
        return {
            'num_episodes': NUM_EPISODES,
            'learning_rate': LEARNING_RATE,
            'discount_factor': DISCOUNT_FACTOR,
            'epsilon_start': EPSILON_START,
            'epsilon_end': EPSILON_END,
            'epsilon_decay': EPSILON_DECAY,
            'use_stubs': True,
            'save_interval': 100,
            'analysis_interval': 250,
            'render_episodes': False,
            'save_path': 'models/budget_orchestrator_agent',
            'use_q_iteration': True,
            'q_iteration_frequency': 500
        }
    
    # Initialize environment with form dataset
    def setup_environment(self):
        try:
            dataset_root = "training/dataset_forms"
            self.train_loader, self.test_loader = create_data_loaders(dataset_root)
            
        except Exception as e:
            self.train_loader = None
            self.test_loader = None
        
        sample_user_info = {
            'patient_name': 'John Doe',
            'date_of_birth': '01/15/1990',
            'ssn': '123-45-6789',
            'phone': '(555) 123-4567',
            'address': '123 Main St, Anytown, USA',
            'email': 'john.doe@example.com',
            'insurance_id': '1234567890',
            'medical_condition': 'Diabetes',
            'medication': 'Metformin 500mg'
        }
        
        sample_chat_history = [
            {'type': 'user', 'content': 'I need help filling out a medical form', 'timestamp': 1234567890},
            {'type': 'assistant', 'content': 'I can help you with that. Let me start by checking what information I already have.', 'timestamp': 1234567891}
        ]
        
        self.env = EnhancedFormFillingEnv(
            use_stubs=self.config['use_stubs'],
            user_info=sample_user_info,
            chat_history=sample_chat_history
        )
    
    # Generate realistic user context for form fields
    def generate_realistic_user_context(self, form_fields: List[Dict[str, Any]]) -> Dict[str, Any]:
        user_context = {}
        
        realistic_values = {
            'name': ['John Doe', 'Jane Smith', 'Michael Johnson', 'Sarah Wilson', 'David Brown'],
            'date': ['01/15/1990', '03/22/1985', '12/08/1992', '07/14/1988', '09/30/1995'],
            'ssn': ['123-45-6789', '987-65-4321', '555-44-3333', '111-22-3333'],
            'phone': ['(555) 123-4567', '(555) 987-6543', '(555) 555-1234', '(555) 444-5555'],
            'email': ['john.doe@email.com', 'jane.smith@email.com', 'user@example.com'],
            'address': ['123 Main St, Anytown, ST 12345', '456 Oak Ave, City, ST 67890'],
            'insurance_id': ['INS123456789', 'POL987654321', 'MEM555444333'],
            'medical_condition': ['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease'],
            'medication': ['Metformin 500mg', 'Lisinopril 10mg', 'Albuterol inhaler'],
            'other': ['Sample Value', 'Example Data', 'User Information']
        }
        
        for field in form_fields:
            field_type = field.get('field_type', 'other')
            field_name = field.get('name', f"field_{field.get('id', 'unknown')}")
            question = field.get('question', '').lower()
            
            if field_type in realistic_values:
                user_context[field_name] = np.random.choice(realistic_values[field_type])
            elif any(keyword in question for keyword in ['name', 'patient']):
                user_context[field_name] = np.random.choice(realistic_values['name'])
            elif any(keyword in question for keyword in ['date', 'birth', 'dob']):
                user_context[field_name] = np.random.choice(realistic_values['date'])
            elif any(keyword in question for keyword in ['phone', 'telephone']):
                user_context[field_name] = np.random.choice(realistic_values['phone'])
            elif any(keyword in question for keyword in ['email', 'mail']):
                user_context[field_name] = np.random.choice(realistic_values['email'])
            elif any(keyword in question for keyword in ['address', 'street']):
                user_context[field_name] = np.random.choice(realistic_values['address'])
            elif any(keyword in question for keyword in ['ssn', 'social', 'security']):
                user_context[field_name] = np.random.choice(realistic_values['ssn'])
            elif any(keyword in question for keyword in ['insurance', 'policy']):
                user_context[field_name] = np.random.choice(realistic_values['insurance_id'])
            elif any(keyword in question for keyword in ['condition', 'diagnosis', 'medical']):
                user_context[field_name] = np.random.choice(realistic_values['medical_condition'])
            elif any(keyword in question for keyword in ['medication', 'drug', 'prescription']):
                user_context[field_name] = np.random.choice(realistic_values['medication'])
            else:
                user_context[field_name] = np.random.choice(realistic_values['other'])
        
        user_context.update({
            'patient_name': np.random.choice(realistic_values['name']),
            'base_phone': np.random.choice(realistic_values['phone']),
            'base_email': np.random.choice(realistic_values['email'])
        })
        
        return user_context

    # Get training form data from real dataset or synthetic fallback
    def get_training_form_data(self) -> Dict[str, Any]:
        if self.train_loader is None:
            synthetic_fields = self.generate_synthetic_medical_form()
            return {
                'form_fields': synthetic_fields,
                'document_quality': 'fair',
                'sample_id': f'synthetic_{np.random.randint(10000)}',
                'has_real_data': False,
                'user_context': self.generate_realistic_user_context(synthetic_fields)
            }
        
        try:
            training_batch = self.train_loader.prepare_training_batch(batch_size=1)
            if training_batch:
                sample = training_batch[0]
                
                env_form_fields = []
                for field in sample['form_fields']:
                    env_field = {
                        'name': f"field_{field['id']}",
                        'type': field['field_type'],
                        'required': field['required'],
                        'description': field['question'],
                        'ground_truth': field['answers'][0] if field['answers'] else "",
                        'ground_truth_confidence': field['confidence'],
                        'question': field['question']
                    }
                    env_form_fields.append(env_field)
                
                realistic_user_context = self.generate_realistic_user_context(sample['form_fields'])
                
                return {
                    'form_fields': env_form_fields,
                    'document_quality': sample['document_quality'],
                    'sample_id': sample['sample_id'],
                    'image_path': sample['image_path'],
                    'has_real_data': True,
                    'original_fields': sample['form_fields'],
                    'user_context': realistic_user_context
                }
                
        except Exception as e:
            return self.get_training_form_data()
        
        synthetic_fields = self.generate_synthetic_medical_form()
        return {
            'form_fields': synthetic_fields,
            'document_quality': 'fair',
            'sample_id': f'synthetic_{np.random.randint(10000)}',
            'has_real_data': False,
            'user_context': self.generate_realistic_user_context(synthetic_fields)
        }
    
    # Generate synthetic medical form fields
    def generate_synthetic_medical_form(self) -> List[Dict[str, Any]]:
        synthetic_fields = [
            {'name': 'patient_name', 'type': 'name', 'required': True, 'question': 'Patient full name'},
            {'name': 'date_of_birth', 'type': 'date', 'required': True, 'question': 'Date of birth'},
            {'name': 'social_security', 'type': 'ssn', 'required': True, 'question': 'Social Security Number'},
            {'name': 'phone_number', 'type': 'phone', 'required': True, 'question': 'Phone number'},
            {'name': 'email_address', 'type': 'email', 'required': False, 'question': 'Email address'},
            {'name': 'home_address', 'type': 'address', 'required': True, 'question': 'Home address'},
            {'name': 'insurance_number', 'type': 'insurance_id', 'required': True, 'question': 'Insurance ID'},
            {'name': 'primary_condition', 'type': 'medical_condition', 'required': True, 'question': 'Primary medical condition'},
            {'name': 'current_medications', 'type': 'medication', 'required': False, 'question': 'Current medications'},
        ]
        return synthetic_fields
    
    # Initialize Q-learning agent
    def setup_agent(self):
        state_space_dims = self.env.state_encoder.state_dims
        
        self.agent = QLearningAgent(
            n_actions=self.env.n_actions,
            state_space_dims=state_space_dims,
            learning_rate=self.config['learning_rate'],
            discount_factor=self.config['discount_factor'],
            epsilon_start=self.config['epsilon_start'],
            epsilon_end=self.config['epsilon_end'],
            epsilon_decay=self.config['epsilon_decay'],
            save_path=self.config['save_path']
        )
    
    # Initialize analytics tracking
    def setup_analytics(self):
        self.episode_analytics = {
            'rewards': [],
            'costs': [],
            'latencies': [],
            'completion_rates': [],
            'field_type_success': [],
            'criticality_performance': [],
            'context_utilizations': [],
            'budget_violations': [],
            'latency_violations': []
        }
        
        self.training_milestones = []
        self.policy_snapshots = []
    
    # Main training loop
    def train(self) -> Dict[str, Any]:
        self.training_start_time = time.time()
        
        best_performance = {'reward': -float('inf'), 'episode': 0}
        
        for episode in range(self.config['num_episodes']):
            episode_start_time = time.time()
            
            episode_results = self.run_episode(episode)
            
            self.agent.end_episode(
                episode_results['total_reward'], 
                episode_results['info']
            )
            
            self.update_analytics(episode_results)
            
            if episode_results['total_reward'] > best_performance['reward']:
                best_performance.update({
                    'reward': episode_results['total_reward'],
                    'episode': episode,
                    'completion_rate': episode_results['info']['completion_rate'],
                    'cost': episode_results['info']['budget_spent']
                })
            
            if (self.config['use_q_iteration'] and 
                episode > 0 and 
                episode % self.config['q_iteration_frequency'] == 0):
                self.run_q_iteration_optimization(episode)
            
            if episode % 100 == 0 and episode > 0:
                self.log_progress(episode, episode_results, best_performance)
            
            if episode % self.config['analysis_interval'] == 0 and episode > 0:
                self.run_detailed_analysis(episode)
                self.capture_policy_snapshot(episode)
            
            if episode % self.config['save_interval'] == 0 and episode > 0:
                self.save_checkpoint(episode)
        
        training_time = time.time() - self.training_start_time
        return self.finalize_training(training_time, best_performance)
    
    # Run single episode
    def run_episode(self, episode_num: int) -> Dict[str, Any]:
        form_data = self.get_training_form_data()
        
        obs, info = self.env.reset(options=form_data)
        
        episode_rewards = []
        step_count = 0
        done = False
        
        while not done and step_count < 1000:
            action = self.agent.choose_action(obs, training=True)
            
            next_obs, reward, done, truncated, next_info = self.env.step(action)
            
            self.agent.update(obs, action, reward, next_obs, done, next_info)
            
            episode_rewards.append(reward)
            obs = next_obs
            info = next_info
            step_count += 1
            
            if truncated:
                done = True
        
        return {
            'total_reward': sum(episode_rewards),
            'episode_length': step_count,
            'info': info,
            'sample_id': form_data.get('sample_id', 'unknown'),
            'has_real_data': form_data.get('has_real_data', False)
        }
    
    # Run detailed analysis
    def run_detailed_analysis(self, episode: int):
        analytics = self.agent.get_analytics()
        
        analysis_results = {
            'episode': episode,
            'q_table_size': len(self.agent.q_table),
            'state_coverage': analytics.get('state_space_coverage', 0),
            'recent_performance': {
                'reward': analytics.get('recent_average_reward', 0),
                'cost': analytics.get('recent_average_cost', 0),
                'completion': analytics.get('recent_completion_rate', 0)
            }
        }
        
        self.training_milestones.append(analysis_results)
    
    # Update analytics
    def update_analytics(self, episode_results: Dict[str, Any]):
        self.episode_analytics['rewards'].append(episode_results['total_reward'])
        self.episode_analytics['costs'].append(episode_results['info'].get('budget_spent', 0))
        self.episode_analytics['latencies'].append(episode_results['info'].get('latency_spent', 0))
        self.episode_analytics['completion_rates'].append(episode_results['info'].get('completion_rate', 0))
        
        if episode_results['info'].get('budget_spent', 0) > MAX_BUDGET_PER_FORM:
            self.episode_analytics['budget_violations'].append(1)
        else:
            self.episode_analytics['budget_violations'].append(0)
    
    # Log training progress
    def log_progress(self, episode: int, episode_results: Dict[str, Any], best_performance: Dict[str, Any]):
        recent_window = min(100, len(self.episode_analytics['rewards']))
        recent_rewards = self.episode_analytics['rewards'][-recent_window:]
        recent_costs = self.episode_analytics['costs'][-recent_window:]
        recent_completion = self.episode_analytics['completion_rates'][-recent_window:]
        
        print(f"\nEpisode {episode}:")
        print(f"  Recent avg reward: {np.mean(recent_rewards):.2f}")
        print(f"  Recent avg cost: ${np.mean(recent_costs):.4f}")
        print(f"  Recent completion: {np.mean(recent_completion):.2%}")
        print(f"  Best reward: {best_performance['reward']:.2f} (episode {best_performance['episode']})")
        print(f"  Q-table size: {len(self.agent.q_table):,}")
        print(f"  Epsilon: {self.agent.epsilon:.3f}")
    
    # Run Q-iteration optimization
    def run_q_iteration_optimization(self, episode: int):
        q_iteration_results = self.agent.q_iteration_backup(self.env, num_iterations=50)
    
    # Capture policy snapshot
    def capture_policy_snapshot(self, episode: int):
        policy_summary = self.agent.get_policy_summary()
        
        snapshot = {
            'episode': episode,
            'policy_size': len(policy_summary),
            'epsilon': self.agent.epsilon,
            'q_table_size': len(self.agent.q_table)
        }
        
        self.policy_snapshots.append(snapshot)
    
    # Save checkpoint
    def save_checkpoint(self, episode: int):
        checkpoint_data = {
            'episode': episode,
            'agent_state': self.agent.get_analytics(),
            'training_analytics': self.episode_analytics,
            'config': self.config
        }
        
        checkpoint_path = f"{self.config['save_path']}_training_checkpoint_{episode}.json"
        
        try:
            with open(checkpoint_path, 'w') as f:
                json.dump(checkpoint_data, f, indent=2)
        except Exception as e:
            pass
    
    # Finalize training
    def finalize_training(self, training_time: float, best_performance: Dict[str, Any]) -> Dict[str, Any]:
        self.agent.save_agent(f"{self.config['save_path']}_final.pkl")
        
        final_analytics = self.agent.get_analytics()
        
        training_summary = {
            'training_time': training_time,
            'total_episodes': self.config['num_episodes'],
            'best_performance': best_performance,
            'final_analytics': final_analytics,
            'q_table_size': len(self.agent.q_table),
            'training_milestones': self.training_milestones[-10:],
            'policy_snapshots': self.policy_snapshots[-5:]
        }
        
        results_path = f"{self.config['save_path']}_results.json"
        
        try:
            with open(results_path, 'w') as f:
                json.dump(training_summary, f, indent=2)
        except Exception as e:
            pass
        
        return training_summary
    
    # Evaluate final policy
    def evaluate_final_policy(self, num_eval_episodes: int = 50) -> Dict[str, Any]:
        eval_rewards = []
        eval_completion_rates = []
        eval_costs = []
        
        for _ in range(num_eval_episodes):
            form_data = self.get_training_form_data()
            obs, info = self.env.reset(options=form_data)
            
            episode_reward = 0
            done = False
            step_count = 0
            
            while not done and step_count < 1000:
                action = self.agent.choose_action(obs, training=False)
                obs, reward, done, truncated, info = self.env.step(action)
                episode_reward += reward
                step_count += 1
                
                if truncated:
                    done = True
            
            eval_rewards.append(episode_reward)
            eval_completion_rates.append(info.get('completion_rate', 0))
            eval_costs.append(info.get('budget_spent', 0))
        
        return {
            'average_reward': np.mean(eval_rewards),
            'average_completion_rate': np.mean(eval_completion_rates),
            'average_cost': np.mean(eval_costs),
            'budget_compliance_rate': sum(1 for cost in eval_costs if cost <= MAX_BUDGET_PER_FORM) / len(eval_costs)
        }

# Main training function
def main():
    config = {
        'num_episodes': 2000,
        'use_stubs': True,
        'save_interval': 100,
        'analysis_interval': 250
    }
    
    orchestrator = EnhancedTrainingOrchestrator(config)
    results = orchestrator.train()
    
    print(f"\nTraining completed!")
    print(f"Total episodes: {results['total_episodes']}")
    print(f"Training time: {results['training_time']:.2f} seconds")
    print(f"Best reward: {results['best_performance']['reward']:.2f}")
    print(f"Final Q-table size: {results['q_table_size']:,}")
    
    eval_results = orchestrator.evaluate_final_policy()
    print(f"\nEvaluation results:")
    print(f"Average reward: {eval_results['average_reward']:.2f}")
    print(f"Average completion rate: {eval_results['average_completion_rate']:.2%}")
    print(f"Average cost: ${eval_results['average_cost']:.4f}")
    print(f"Budget compliance: {eval_results['budget_compliance_rate']:.2%}")

if __name__ == "__main__":
    main()
