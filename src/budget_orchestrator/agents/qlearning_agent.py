# Enhanced Q-learning agent for medical form filling with context awareness

import numpy as np
import pickle
from typing import Dict, Any, Tuple, Optional, List
from collections import defaultdict, Counter, deque
import json
import sys
import os

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

# Update import path to absolute imports
from config import (
    LEARNING_RATE, DISCOUNT_FACTOR, EPSILON_START, EPSILON_END, EPSILON_DECAY,
    FIELD_TYPES, FIELD_CRITICALITY, ESTIMATED_STATE_SPACE_SIZE, CORE_ACTIONS
)

class QLearningAgent:
    # Initialize Q-learning agent with medical context awareness
    def __init__(self, n_actions: int, state_space_dims: Dict[str, int], 
                 learning_rate: float = LEARNING_RATE, discount_factor: float = DISCOUNT_FACTOR,
                 epsilon_start: float = EPSILON_START, epsilon_end: float = EPSILON_END,
                 epsilon_decay: float = EPSILON_DECAY, save_path: str = None):
        
        self.n_actions = n_actions
        self.action_names = CORE_ACTIONS
        self.state_space_dims = state_space_dims
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.epsilon_start = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.epsilon = epsilon_start
        self.save_path = save_path or "qlearning_agent.pkl"
        
        # Enhanced Q-table with default values
        self.q_table = defaultdict(lambda: np.zeros(n_actions))
        
        # Pre-computed state features for efficiency (inspired by tutorial)
        self.state_cache = {}
        self.observation_cache = {}
        
        # Enhanced analytics
        self.episode_rewards = []
        self.episode_costs = []
        self.episode_latencies = []
        self.completion_rates = []
        self.action_counts = defaultdict(int)
        self.convergence_window = deque(maxlen=100)
        self.state_visit_counts = defaultdict(int)
        self.state_action_counts = defaultdict(lambda: defaultdict(int))
        
        # Context and medical-aware metrics
        self.context_utilization_rewards = []
        self.field_type_performance = {field_type: {'successes': 0, 'attempts': 0} for field_type in FIELD_TYPES}
        self.criticality_performance = {'low': defaultdict(int), 'medium': defaultdict(int), 'high': defaultdict(int)}
        self.multi_field_extractions = 0
        self.user_corrections_learned = 0
        
        # Learning optimization
        self.learning_rate_schedule = {}
        self.adaptive_epsilon = True
        self.exploration_bonus = 0.1
        
        # Clean state encoding inspired by tutorial
        self.state_encoder = self.create_state_encoder()
        
        # Q-iteration support
        self.transition_model = None
        self.reward_model = None
        
        # Checkpointing
        self.last_checkpoint = 0
        self.checkpoint_interval = 100
    
    # Create state encoder for Q-table indexing
    def create_state_encoder(self) -> Dict[str, Any]:
        encoder = {
            'dims': self.state_space_dims,
            'state_space_size': 1
        }
        
        for dim_size in self.state_space_dims.values():
            encoder['state_space_size'] *= dim_size
            
        return encoder
    
    # Encode observation to state tuple
    def encode_state(self, observation: Dict[str, Any]) -> Tuple:
        obs_items = []
        for key, value in observation.items():
            if isinstance(value, np.ndarray):
                obs_items.append((key, tuple(value.tolist())))
            else:
                obs_items.append((key, value))
        
        obs_key = tuple(sorted(obs_items))
        
        if obs_key in self.state_cache:
            return self.state_cache[obs_key]
        
        state_tuple = (
            observation.get('field_index', 0),
            observation.get('field_type', 0),
            observation.get('budget_bucket', 0),
            observation.get('latency_bucket', 0),
            observation.get('confidence_bucket', 0),
            observation.get('criticality_bucket', 0),
            observation.get('context_available_bucket', 0),
            observation.get('document_quality_bucket', 0),
            observation.get('user_engagement_bucket', 0),
            observation.get('last_tool', 0),
            observation.get('field_filled', 0)
        )
        
        self.state_cache[obs_key] = state_tuple
        return state_tuple
    
    # Decode state tuple to dictionary
    def decode_state(self, state_tuple: Tuple) -> Dict[str, Any]:
        if len(state_tuple) != len(self.state_space_dims):
            raise ValueError(f"Invalid state tuple length: {len(state_tuple)}")
        
        keys = list(self.state_space_dims.keys())
        return {keys[i]: state_tuple[i] for i in range(len(keys))}
    
    # Convert state to readable string
    def state_to_readable(self, state_tuple: Tuple) -> str:
        decoded = self.decode_state(state_tuple)
        field_type_name = FIELD_TYPES[decoded['field_type']] if decoded['field_type'] < len(FIELD_TYPES) else 'unknown'
        criticality_name = ['low', 'medium', 'high'][decoded['criticality_bucket']]
        context_name = ['unlikely', 'maybe', 'likely'][decoded['context_available_bucket']]
        
        return f"Field_{decoded['field_index']}({field_type_name})_Crit_{criticality_name}_Ctx_{context_name}"
    
    # Get valid actions from action mask
    def get_valid_actions(self, observation: Dict[str, Any]) -> np.ndarray:
        return observation.get('action_mask', np.ones(self.n_actions))
    
    # Compute deterministic policy from Q-table
    def compute_policy_deterministic(self, eps_greedy: float = 0.0) -> Dict[Tuple, np.ndarray]:
        policy = {}
        
        for state_tuple, q_values in self.q_table.items():
            policy_probs = np.zeros_like(q_values)
            best_action = np.argmax(q_values)
            policy_probs[best_action] = 1.0 - eps_greedy
            policy_probs += eps_greedy / len(q_values)
            policy[state_tuple] = policy_probs
        
        return policy
    
    # Get action probabilities for current state
    def get_action_probabilities(self, observation: Dict[str, Any]) -> Dict[str, float]:
        state = self.encode_state(observation)
        valid_actions = self.get_valid_actions(observation)
        q_values = self.q_table[state]
        
        masked_q_values = q_values.copy()
        masked_q_values[valid_actions == 0] = -np.inf
        
        temperature = max(0.1, self.epsilon)
        exp_values = np.exp(masked_q_values / temperature)
        exp_values[valid_actions == 0] = 0
        
        if np.sum(exp_values) == 0:
            probs = valid_actions / np.sum(valid_actions)
        else:
            probs = exp_values / np.sum(exp_values)
        
        return {self.action_names[i]: probs[i] for i in range(self.n_actions)}
    
    # Stack Q-values into matrix form
    def stack_q_values(self) -> np.ndarray:
        if not self.q_table:
            return np.zeros((1, self.n_actions))
        
        states = list(self.q_table.keys())
        q_matrix = np.zeros((len(states), self.n_actions))
        
        for i, state in enumerate(states):
            q_matrix[i] = self.q_table[state]
        
        return q_matrix, states
    
    # Perform Q-iteration updates
    def q_iteration_backup(self, env, num_iterations: int = 50) -> Dict[str, Any]:
        if not self.q_table:
            return {}
        
        original_q_table = {k: v.copy() for k, v in self.q_table.items()}
        convergence_errors = []
        
        for iteration in range(num_iterations):
            new_q_table = defaultdict(lambda: np.zeros(self.n_actions))
            max_error = 0.0
            
            for state_tuple, q_values in self.q_table.items():
                for action in range(self.n_actions):
                    max_next_q = np.max(q_values)
                    new_q_value = 0.0 + self.discount_factor * max_next_q
                    
                    error = abs(new_q_value - q_values[action])
                    max_error = max(max_error, error)
                    
                    new_q_table[state_tuple][action] = new_q_value
            
            self.q_table = new_q_table
            convergence_errors.append(max_error)
            
            if max_error < 1e-6:
                break
        
        return {
            'iterations': len(convergence_errors),
            'final_error': convergence_errors[-1] if convergence_errors else 0,
            'convergence_errors': convergence_errors
        }

    # Choose action with context-aware exploration
    def choose_action(self, observation: Dict[str, Any], training: bool = True) -> int:
        state = self.encode_state(observation)
        valid_actions = self.get_valid_actions(observation)
        
        self.state_visit_counts[state] += 1
        
        if training:
            context_epsilon = self.calculate_context_epsilon(observation)
            
            if np.random.random() < context_epsilon:
                action = self.context_biased_exploration(observation, valid_actions)
            else:
                q_values = self.q_table[state].copy()
                q_values[valid_actions == 0] = -np.inf
                action = np.argmax(q_values)
        else:
            q_values = self.q_table[state].copy()
            q_values[valid_actions == 0] = -np.inf
            action = np.argmax(q_values)
        
        action_name = self.action_names[action] if action < len(self.action_names) else f'action_{action}'
        self.action_counts[action_name] += 1
        self.state_action_counts[state][action] += 1
        
        return action
    
    # Calculate context-aware epsilon
    def calculate_context_epsilon(self, observation: Dict[str, Any]) -> float:
        base_epsilon = self.epsilon
        
        criticality_bucket = observation.get('criticality_bucket', 1)
        if criticality_bucket == 2:
            base_epsilon *= 0.5
        elif criticality_bucket == 0:
            base_epsilon *= 1.2
        
        context_available = observation.get('context_available_bucket', 0)
        if context_available == 2:
            base_epsilon *= 0.7
        
        state = self.encode_state(observation)
        state_familiarity = self.state_visit_counts.get(state, 0)
        if state_familiarity < 5:
            base_epsilon *= 1.3
        
        return min(1.0, max(self.epsilon_end, base_epsilon))
    
    # Context-biased exploration strategy
    def context_biased_exploration(self, observation: Dict[str, Any], valid_actions: np.ndarray) -> int:
        valid_indices = np.where(valid_actions == 1)[0]
        
        if len(valid_indices) == 0:
            return 0
        
        action_weights = np.ones(len(valid_indices))
        
        criticality_bucket = observation.get('criticality_bucket', 1)
        context_available = observation.get('context_available_bucket', 0)
        document_quality = observation.get('document_quality_bucket', 1)
        user_engagement = observation.get('user_engagement_bucket', 1)
        field_filled = observation.get('field_filled', 0)
        
        for i, action_idx in enumerate(valid_indices):
            action_name = self.action_names[action_idx]
            
            if action_name == 'extract_from_document':
                if document_quality == 2 and field_filled == 0:
                    action_weights[i] *= 2.0
                elif document_quality == 0:
                    action_weights[i] *= 0.5
                    
            elif action_name == 'retrieve_information':
                if context_available >= 1:
                    action_weights[i] *= 1.5
                else:
                    action_weights[i] *= 0.5
                    
            elif action_name == 'ask_user':
                if criticality_bucket == 2:
                    action_weights[i] *= 1.8
                if user_engagement == 2:
                    action_weights[i] *= 1.3
                elif user_engagement == 0:
                    action_weights[i] *= 0.6
                    
            elif action_name == 'skip':
                if criticality_bucket == 2:
                    action_weights[i] *= 0.1
                elif criticality_bucket == 0:
                    action_weights[i] *= 1.5
        
        action_weights = action_weights / np.sum(action_weights)
        chosen_idx = np.random.choice(len(valid_indices), p=action_weights)
        return valid_indices[chosen_idx]
    
    # Update Q-table with adaptive learning rates
    def update(self, state: Dict[str, Any], action: int, reward: float, 
               next_state: Dict[str, Any], done: bool, info: Dict[str, Any]):
        current_state = self.encode_state(state)
        next_state_encoded = self.encode_state(next_state) if not done else None
        
        state_visits = self.state_visit_counts.get(current_state, 1)
        adaptive_lr = self.learning_rate / (1 + 0.001 * state_visits)
        adaptive_lr = max(0.01, adaptive_lr)
        
        current_q = self.q_table[current_state][action]
        
        if done:
            target_q = reward
        else:
            next_q_values = self.q_table[next_state_encoded]
            next_valid_actions = self.get_valid_actions(next_state)
            masked_next_q = next_q_values.copy()
            masked_next_q[next_valid_actions == 0] = -np.inf
            max_next_q = np.max(masked_next_q) if np.any(next_valid_actions) else 0
            target_q = reward + self.discount_factor * max_next_q
        
        td_error = target_q - current_q
        self.q_table[current_state][action] += adaptive_lr * td_error
        
        self.convergence_window.append(abs(td_error))
        self.update_medical_metrics(state, action, reward, info)
    
    # Update medical performance metrics
    def update_medical_metrics(self, state: Dict[str, Any], action: int, 
                              reward: float, info: Dict[str, Any]):
        
        field_type_idx = state.get('field_type', 0)
        if field_type_idx < len(FIELD_TYPES):
            field_type = FIELD_TYPES[field_type_idx]
            self.field_type_performance[field_type]['attempts'] += 1
            
            if reward > 0 and info.get('field_values'):
                self.field_type_performance[field_type]['successes'] += 1
        
        criticality_bucket = state.get('criticality_bucket', 1)
        criticality_level = ['low', 'medium', 'high'][criticality_bucket]
        action_name = self.action_names[action] if action < len(self.action_names) else f'action_{action}'
        self.criticality_performance[criticality_level][action_name] += 1
        
        if info.get('context_utilizations', 0) > 0:
            self.context_utilization_rewards.append(reward)
        
        if info.get('multi_field_extractions', 0) > 0:
            self.multi_field_extractions += info['multi_field_extractions']
        
        if info.get('user_corrections_learned', 0) > 0:
            self.user_corrections_learned += info['user_corrections_learned']
    
    # Complete episode and update metrics
    def end_episode(self, episode_reward: float, episode_info: Dict[str, Any]):
        self.episode_rewards.append(episode_reward)
        self.episode_costs.append(episode_info.get('budget_spent', 0))
        self.episode_latencies.append(episode_info.get('latency_spent', 0))
        self.completion_rates.append(episode_info.get('completion_rate', 0))
        
        if self.adaptive_epsilon:
            self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)
        
        episode_num = len(self.episode_rewards)
        if episode_num - self.last_checkpoint >= self.checkpoint_interval:
            self.save_checkpoint(episode_num)
            self.last_checkpoint = episode_num

    # Get comprehensive analytics
    def get_analytics(self) -> Dict[str, Any]:
        if not self.episode_rewards:
            return {"error": "No episodes completed yet"}
        
        basic_metrics = {
            'total_episodes': len(self.episode_rewards),
            'average_reward': np.mean(self.episode_rewards),
            'average_cost': np.mean(self.episode_costs),
            'average_latency': np.mean(self.episode_latencies),
            'average_completion_rate': np.mean(self.completion_rates),
            'current_epsilon': self.epsilon,
            'q_table_size': len(self.q_table),
            'unique_states_visited': len(self.state_visit_counts),
            'state_space_coverage': len(self.state_visit_counts) / self.state_encoder.get('state_space_size', 1)
        }
        
        recent_window = min(100, len(self.episode_rewards))
        recent_metrics = {
            'recent_average_reward': np.mean(self.episode_rewards[-recent_window:]),
            'recent_average_cost': np.mean(self.episode_costs[-recent_window:]),
            'recent_completion_rate': np.mean(self.completion_rates[-recent_window:]),
            'reward_trend': 'improving' if len(self.episode_rewards) > 50 and 
                          np.mean(self.episode_rewards[-25:]) > np.mean(self.episode_rewards[-50:-25]) else 'stable'
        }
        
        total_actions = sum(self.action_counts.values())
        action_distribution = {
            action: count / total_actions if total_actions > 0 else 0 
            for action, count in self.action_counts.items()
        }
        
        field_performance = {}
        for field_type, stats in self.field_type_performance.items():
            if stats['attempts'] > 0:
                field_performance[field_type] = {
                    'success_rate': stats['successes'] / stats['attempts'],
                    'attempts': stats['attempts']
                }
        
        criticality_analysis = {}
        for level, actions in self.criticality_performance.items():
            total_level_actions = sum(actions.values())
            if total_level_actions > 0:
                criticality_analysis[level] = {
                    'total_actions': total_level_actions,
                    'action_distribution': {action: count / total_level_actions 
                                          for action, count in actions.items()}
                }
        
        return {
            **basic_metrics,
            **recent_metrics,
            'action_distribution': action_distribution,
            'field_performance': field_performance,
            'criticality_analysis': criticality_analysis,
            'convergence_td_error': np.mean(self.convergence_window) if self.convergence_window else 0
        }
    
    # Get policy summary
    def get_policy_summary(self) -> Dict[str, Any]:
        if not self.q_table:
            return {}
        
        policy_stats = {}
        for state_tuple, q_values in self.q_table.items():
            best_action = np.argmax(q_values)
            readable_state = self.state_to_readable(state_tuple)
            action_name = self.action_names[best_action] if best_action < len(self.action_names) else f'action_{best_action}'
            
            policy_stats[readable_state] = {
                'best_action': action_name,
                'q_values': q_values.tolist(),
                'visits': self.state_visit_counts.get(state_tuple, 0)
            }
        
        return policy_stats
    
    # Extract deterministic policy
    def extract_deterministic_policy(self, eps_greedy: float = 0.0) -> Dict[str, Any]:
        policy = self.compute_policy_deterministic(eps_greedy)
        
        policy_dict = {}
        for state_tuple, probs in policy.items():
            readable_state = self.state_to_readable(state_tuple)
            best_action_idx = np.argmax(probs)
            best_action_name = self.action_names[best_action_idx] if best_action_idx < len(self.action_names) else f'action_{best_action_idx}'
            
            policy_dict[readable_state] = {
                'action': best_action_name,
                'action_index': best_action_idx,
                'action_probs': probs.tolist()
            }
        
        return policy_dict
    
    # Save checkpoint
    def save_checkpoint(self, episode_num: int):
        checkpoint_data = {
            'q_table': dict(self.q_table),
            'episode_rewards': self.episode_rewards,
            'episode_costs': self.episode_costs,
            'episode_latencies': self.episode_latencies,
            'completion_rates': self.completion_rates,
            'action_counts': dict(self.action_counts),
            'state_visit_counts': dict(self.state_visit_counts),
            'epsilon': self.epsilon,
            'episode_num': episode_num
        }
        
        checkpoint_path = f"{self.save_path.replace('.pkl', '')}_checkpoint_{episode_num}.pkl"
        
        try:
            with open(checkpoint_path, 'wb') as f:
                pickle.dump(checkpoint_data, f)
        except Exception as e:
            pass
    
    # Save agent
    def save_agent(self, filepath: str = None):
        save_path = filepath or self.save_path
        
        agent_data = {
            'q_table': dict(self.q_table),
            'state_space_dims': self.state_space_dims,
            'n_actions': self.n_actions,
            'action_names': self.action_names,
            'learning_rate': self.learning_rate,
            'discount_factor': self.discount_factor,
            'epsilon': self.epsilon,
            'epsilon_start': self.epsilon_start,
            'epsilon_end': self.epsilon_end,
            'epsilon_decay': self.epsilon_decay,
            'episode_rewards': self.episode_rewards,
            'episode_costs': self.episode_costs,
            'episode_latencies': self.episode_latencies,
            'completion_rates': self.completion_rates,
            'action_counts': dict(self.action_counts),
            'state_visit_counts': dict(self.state_visit_counts),
            'field_type_performance': self.field_type_performance,
            'criticality_performance': {k: dict(v) for k, v in self.criticality_performance.items()}
        }
        
        try:
            with open(save_path, 'wb') as f:
                pickle.dump(agent_data, f)
        except Exception as e:
            pass
    
    # Load agent
    def load_agent(self, filepath: str = None):
        load_path = filepath or self.save_path
        
        try:
            with open(load_path, 'rb') as f:
                agent_data = pickle.load(f)
            
            self.q_table = defaultdict(lambda: np.zeros(self.n_actions))
            for state_tuple, q_values in agent_data['q_table'].items():
                if isinstance(q_values, list):
                    q_values = np.array(q_values)
                self.q_table[state_tuple] = q_values
            
            self.epsilon = agent_data.get('epsilon', self.epsilon)
            self.episode_rewards = agent_data.get('episode_rewards', [])
            self.episode_costs = agent_data.get('episode_costs', [])
            self.episode_latencies = agent_data.get('episode_latencies', [])
            self.completion_rates = agent_data.get('completion_rates', [])
            
            self.action_counts = defaultdict(int)
            for action, count in agent_data.get('action_counts', {}).items():
                self.action_counts[action] = count
            
            self.state_visit_counts = defaultdict(int)
            for state_tuple, count in agent_data.get('state_visit_counts', {}).items():
                self.state_visit_counts[state_tuple] = count
            
            return True
            
        except Exception as e:
            return False
    
    # Reset metrics
    def reset_metrics(self):
        self.episode_rewards = []
        self.episode_costs = []
        self.episode_latencies = []
        self.completion_rates = []
        self.action_counts = defaultdict(int)
        self.state_visit_counts = defaultdict(int)
        self.state_action_counts = defaultdict(lambda: defaultdict(int))
        self.context_utilization_rewards = []
        self.field_type_performance = {field_type: {'successes': 0, 'attempts': 0} for field_type in FIELD_TYPES}
        self.criticality_performance = {'low': defaultdict(int), 'medium': defaultdict(int), 'high': defaultdict(int)}
        self.multi_field_extractions = 0
        self.user_corrections_learned = 0


class SharedQTable:
    # Initialize shared Q-table for multi-agent learning
    def __init__(self, n_actions: int, state_dims: Dict[str, int]):
        self.n_actions = n_actions
        self.state_dims = state_dims
        self.q_table = defaultdict(lambda: np.zeros(n_actions))
        self.access_counts = defaultdict(int)
    
    # Get Q-values for state
    def get_q_values(self, state_key: Tuple) -> np.ndarray:
        self.access_counts[state_key] += 1
        return self.q_table[state_key].copy()
    
    # Update Q-value for state-action pair
    def update_q_value(self, state_key: Tuple, action: int, new_value: float) -> None:
        self.q_table[state_key][action] = new_value
    
    # Get best action for state
    def get_best_action(self, state_key: Tuple, valid_actions: List[int] = None) -> int:
        q_values = self.get_q_values(state_key)
        
        if valid_actions:
            masked_q = q_values.copy()
            for i in range(len(q_values)):
                if i not in valid_actions:
                    masked_q[i] = -np.inf
            return np.argmax(masked_q)
        
        return np.argmax(q_values)
    
    # Get state coverage statistics
    def get_state_coverage(self) -> Dict[str, Any]:
        total_possible_states = 1
        for dim_size in self.state_dims.values():
            total_possible_states *= dim_size
        
        return {
            'visited_states': len(self.q_table),
            'total_possible_states': total_possible_states,
            'coverage_percentage': len(self.q_table) / total_possible_states * 100,
            'average_access_count': np.mean(list(self.access_counts.values())) if self.access_counts else 0
        }
