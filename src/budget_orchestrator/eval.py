# Evaluation script for trained medical form filling agent

import os
import sys
import numpy as np
import json
import argparse
from typing import Dict, List, Any

sys.path.append('.')
from env.form_env import EnhancedFormFillingEnv
from agents.qlearning_agent import QLearningAgent
from config import FIELD_TYPES, MAX_BUDGET_PER_FORM, MAX_LATENCY_PER_FORM

# Evaluate trained agent on medical forms
def evaluate_agent(
    env: EnhancedFormFillingEnv,
    agent: QLearningAgent,
    num_episodes: int = 100,
    render: bool = False
) -> Dict[str, Any]:
    # Disable exploration for evaluation
    original_epsilon = agent.epsilon
    agent.epsilon = 0.0
    
    # Evaluation metrics
    episode_rewards = []
    episode_completion_rates = []
    episode_costs = []
    episode_latencies = []
    within_budget_count = 0
    within_latency_count = 0
    
    # Tool usage statistics
    tool_usage_counts = {tool: 0 for tool in env.action_names}
    tool_success_counts = {tool: 0 for tool in env.action_names}
    
    for episode in range(num_episodes):
        obs, info = env.reset()
        done = False
        
        while not done:
            # Get greedy action from agent
            action = agent.choose_action(obs, training=False)
            action_name = env.action_names[action]
            
            # Track tool usage
            tool_usage_counts[action_name] += 1
            
            # Take action
            next_obs, reward, done, _, next_info = env.step(action)
            
            # Check if action was successful (filled a field)
            if (len(next_info['field_values']) > len(info['field_values'])):
                tool_success_counts[action_name] += 1
            
            # Render if requested
            if render and episode < 3:  # Only render first 3 episodes
                env.render()
            
            obs = next_obs
            info = next_info
        
        # Collect episode metrics
        episode_rewards.append(sum(env.episode_rewards))
        episode_completion_rates.append(info['completion_rate'])
        episode_costs.append(info['budget_spent'])
        episode_latencies.append(info['latency_spent'])
        
        # Check constraint satisfaction
        if info['budget_spent'] <= MAX_BUDGET_PER_FORM:
            within_budget_count += 1
        if info['latency_spent'] <= MAX_LATENCY_PER_FORM:
            within_latency_count += 1
    
    # Restore original epsilon
    agent.epsilon = original_epsilon
    
    # Calculate final statistics
    results = {
        'num_episodes': num_episodes,
        'avg_reward': np.mean(episode_rewards),
        'std_reward': np.std(episode_rewards),
        'avg_completion_rate': np.mean(episode_completion_rates),
        'std_completion_rate': np.std(episode_completion_rates),
        'avg_cost': np.mean(episode_costs),
        'std_cost': np.std(episode_costs),
        'avg_latency': np.mean(episode_latencies),
        'std_latency': np.std(episode_latencies),
        'within_budget_rate': within_budget_count / num_episodes,
        'within_latency_rate': within_latency_count / num_episodes,
        'tool_usage_counts': tool_usage_counts,
        'tool_success_counts': tool_success_counts
    }
    return results

# Evaluate simple baseline policies for comparison
def evaluate_baselines(env: EnhancedFormFillingEnv, num_episodes: int = 100) -> Dict[str, Any]:
    baselines = {}
    
    print("Evaluating random baseline...")
    baselines['random'] = evaluate_random_policy(env, num_episodes)
    
    print("Evaluating cheapest-first baseline...")
    baselines['cheapest_first'] = evaluate_cheapest_policy(env, num_episodes)
    
    return baselines

# Random policy baseline
def evaluate_random_policy(env: EnhancedFormFillingEnv, num_episodes: int) -> Dict[str, Any]:
    episode_rewards = []
    episode_completion_rates = []
    episode_costs = []
    
    for _ in range(num_episodes):
        obs, info = env.reset()
        done = False
        
        while not done:
            # Choose random valid action
            action_mask = obs.get('action_mask')
            valid_actions = [i for i in range(env.n_actions) if action_mask[i] == 1]
            action = np.random.choice(valid_actions) if valid_actions else env.n_actions - 1
            
            obs, reward, done, _, info = env.step(action)
        
        episode_rewards.append(sum(env.episode_rewards))
        episode_completion_rates.append(info['completion_rate'])
        episode_costs.append(info['budget_spent'])
    
    return {
        'avg_reward': np.mean(episode_rewards),
        'avg_completion_rate': np.mean(episode_completion_rates),
        'avg_cost': np.mean(episode_costs)
    }

# Cheapest-first policy baseline
def evaluate_cheapest_policy(env: EnhancedFormFillingEnv, num_episodes: int) -> Dict[str, Any]:
    # Tool order by cost: extract < retrieve < ask_user
    tool_order = [0, 1, 2]  # Indices for extract, retrieve, ask_user
    
    episode_rewards = []
    episode_completion_rates = []
    episode_costs = []
    
    for _ in range(num_episodes):
        obs, info = env.reset()
        done = False
        
        while not done:
            # Try tools in cost order
            action_mask = obs.get('action_mask')
            action = env.n_actions - 1  # Default to skip
            
            for tool_idx in tool_order:
                if action_mask[tool_idx] == 1:
                    action = tool_idx
                    break
            
            obs, reward, done, _, info = env.step(action)
        
        episode_rewards.append(sum(env.episode_rewards))
        episode_completion_rates.append(info['completion_rate'])
        episode_costs.append(info['budget_spent'])
    
    return {
        'avg_reward': np.mean(episode_rewards),
        'avg_completion_rate': np.mean(episode_completion_rates),
        'avg_cost': np.mean(episode_costs)
    }

# Print evaluation results in readable format
def print_evaluation_results(results: Dict[str, Any], baselines: Dict[str, Any] = None):
    print("\n" + "="*60)
    print("MEDICAL FORM FILLING EVALUATION RESULTS")
    print("="*60)
    
    print(f"\nEvaluation episodes: {results['num_episodes']}")
    print(f"\nPerformance Metrics:")
    print(f"  Average Reward: {results['avg_reward']:.2f} ± {results['std_reward']:.2f}")
    print(f"  Completion Rate: {results['avg_completion_rate']:.2%} ± {results['std_completion_rate']:.2%}")
    print(f"  Average Cost: ${results['avg_cost']:.4f} ± ${results['std_cost']:.4f}")
    print(f"  Average Latency: {results['avg_latency']:.1f}s ± {results['std_latency']:.1f}s")
    print(f"  Within Budget: {results['within_budget_rate']:.2%}")
    print(f"  Within Latency: {results['within_latency_rate']:.2%}")
    
    print(f"\nTool Usage Statistics:")
    for tool, count in results['tool_usage_counts'].items():
        success_count = results['tool_success_counts'].get(tool, 0)
        success_rate = success_count / count if count > 0 else 0
        print(f"  {tool}: {count} uses, {success_count} successes ({success_rate:.2%})")
    
    if baselines:
        print(f"\n" + "-"*60)
        print("BASELINE COMPARISONS")
        print("-"*60)
        
        for baseline_name, baseline_results in baselines.items():
            reward_improvement = results['avg_reward'] - baseline_results['avg_reward']
            cost_savings = baseline_results['avg_cost'] - results['avg_cost']
            completion_improvement = results['avg_completion_rate'] - baseline_results['avg_completion_rate']
            
            print(f"\nvs {baseline_name}:")
            print(f"  Reward improvement: {reward_improvement:+.2f}")
            print(f"  Cost savings: ${cost_savings:+.4f}")
            print(f"  Completion improvement: {completion_improvement:+.2%}")

# Main evaluation function
def main():
    parser = argparse.ArgumentParser(description='Evaluate trained medical form filling agent')
    parser.add_argument('--model_path', type=str, required=True, help='Path to trained agent model')
    parser.add_argument('--num_episodes', type=int, default=100, help='Number of evaluation episodes')
    parser.add_argument('--render', action='store_true', help='Render environment during evaluation')
    parser.add_argument('--compare_baselines', action='store_true', help='Compare with baseline policies')
    parser.add_argument('--use_stubs', action='store_true', help='Use stub tools for faster evaluation')
    
    args = parser.parse_args()
    
    # Create environment
    env = EnhancedFormFillingEnv(use_stubs=args.use_stubs)
    
    # Load trained agent
    print(f"Loading trained agent from: {args.model_path}")
    agent = QLearningAgent(
        n_actions=env.n_actions,
        state_space_dims=env.state_encoder.state_dims
    )
    agent.load_agent(args.model_path)
    
    # Evaluate agent
    print(f"\nEvaluating agent over {args.num_episodes} episodes...")
    results = evaluate_agent(env, agent, num_episodes=args.num_episodes, render=args.render)
    
    # Compare with baselines if requested
    baselines = None
    if args.compare_baselines:
        print(f"\nEvaluating baseline policies...")
        baselines = evaluate_baselines(env, num_episodes=args.num_episodes)
    
    # Print results
    print_evaluation_results(results, baselines)
    
    # Save results
    output_path = args.model_path.replace('.pkl', '_eval_results.json')
    output_data = {
        'evaluation_results': results,
        'baselines': baselines,
        'model_path': args.model_path,
        'evaluation_config': {
            'num_episodes': args.num_episodes,
            'use_stubs': args.use_stubs
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"\nResults saved to: {output_path}")

if __name__ == "__main__":
    main()
