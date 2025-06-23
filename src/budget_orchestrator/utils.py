# Utility functions for medical form training analysis and reporting

import os
import json
from typing import Dict, List, Any
import numpy as np
from datetime import datetime

# Load form template from JSON file
def load_form_template(template_path: str) -> List[Dict[str, Any]]:
    try:
        with open(template_path, 'r') as f:
            template = json.load(f)
        
        required_keys = ['name', 'type']
        for field in template:
            if not all(key in field for key in required_keys):
                raise ValueError("Invalid field schema in template")
        
        return template
    except Exception as e:
        return []

# Calculate cost savings metrics
def calculate_cost_savings(original_cost: float, optimized_cost: float) -> Dict[str, float]:
    savings = original_cost - optimized_cost
    savings_percent = (savings / original_cost * 100) if original_cost > 0 else 0
    
    return {
        'original_cost': original_cost,
        'optimized_cost': optimized_cost,
        'absolute_savings': savings,
        'percent_savings': savings_percent,
        'cost_reduction_factor': optimized_cost / original_cost if original_cost > 0 else 0
    }

# Estimate monthly operational costs
def estimate_monthly_costs(
    daily_forms: int,
    cost_per_form: float,
    working_days: int = 22
) -> Dict[str, float]:
    daily_cost = daily_forms * cost_per_form
    monthly_cost = daily_cost * working_days
    yearly_cost = monthly_cost * 12
    
    return {
        'daily_cost': daily_cost,
        'monthly_cost': monthly_cost,
        'yearly_cost': yearly_cost,
        'cost_per_form': cost_per_form
    }

# Analyze tool efficiency metrics
def analyze_tool_efficiency(
    tool_stats: Dict[str, Dict[str, Any]]
) -> Dict[str, float]:
    efficiency_scores = {}
    
    for tool_name, stats in tool_stats.items():
        uses = stats.get('uses', 0)
        successes = stats.get('successes', 0)
        cost = stats.get('total_cost', 0)
        latency = stats.get('total_latency', 0)
        
        if uses > 0:
            success_rate = successes / uses
            cost_per_success = cost / successes if successes > 0 else float('inf')
            avg_latency = latency / uses
            
            efficiency = success_rate / (cost_per_success * avg_latency) if cost_per_success > 0 else 0
            
            efficiency_scores[tool_name] = {
                'success_rate': success_rate,
                'cost_per_success': cost_per_success,
                'avg_latency': avg_latency,
                'efficiency_score': efficiency
            }
    
    return efficiency_scores

# Format time duration for human-readable output
def format_time_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}h"

# Save experiment configuration
def save_experiment_config(
    config: Dict[str, Any],
    save_dir: str,
    filename: str = "experiment_config.json"
):
    os.makedirs(save_dir, exist_ok=True)
    
    config['timestamp'] = datetime.now().isoformat()
    config['version'] = "1.0"
    
    filepath = os.path.join(save_dir, filename)
    with open(filepath, 'w') as f:
        json.dump(config, f, indent=2)

# Load experiment results from directory
def load_experiment_results(results_dir: str) -> Dict[str, Any]:
    results = {}
    
    metrics_files = [f for f in os.listdir(results_dir) if f.startswith('metrics_episode_') and f.endswith('.json')]
    if metrics_files:
        latest_metrics = sorted(metrics_files)[-1]
        with open(os.path.join(results_dir, latest_metrics), 'r') as f:
            results['training_metrics'] = json.load(f)
    
    eval_files = [f for f in os.listdir(results_dir) if f.endswith('_eval_results.json')]
    if eval_files:
        with open(os.path.join(results_dir, eval_files[0]), 'r') as f:
            results['evaluation'] = json.load(f)
    
    config_path = os.path.join(results_dir, "experiment_config.json")
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            results['config'] = json.load(f)
    
    return results

# Create summary report for training results
def create_summary_report(
    results: Dict[str, Any],
    save_path: str = "summary_report.txt"
):
    with open(save_path, 'w') as f:
        f.write("MEDICAL FORM FILLING TRAINING - SUMMARY REPORT\n\n")
        
        if 'training_metrics' in results:
            metrics = results['training_metrics']
            f.write("TRAINING SUMMARY\n")
            f.write(f"Episodes trained: {len(metrics.get('episode_rewards', []))}\n")
            
            if metrics.get('episode_rewards'):
                f.write(f"Final avg reward: {np.mean(metrics['episode_rewards'][-100:]):.2f}\n")
            if metrics.get('episode_fill_rates'):
                f.write(f"Final completion rate: {np.mean(metrics['episode_fill_rates'][-100:]):.2%}\n")
            if metrics.get('episode_budgets'):
                f.write(f"Final avg cost: ${np.mean(metrics['episode_budgets'][-100:]):.4f}\n")
            f.write("\n")
        
        if 'evaluation' in results:
            eval_results = results['evaluation']['evaluation_results']
            f.write("EVALUATION SUMMARY\n")
            f.write(f"Completion rate: {eval_results['avg_fill_rate']:.2%}\n")
            f.write(f"Accuracy: {eval_results['avg_accuracy']:.2%}\n")
            f.write(f"Average cost: ${eval_results['avg_budget']:.4f}\n")
            f.write(f"Within budget: {eval_results['within_budget_rate']:.2%}\n")
            f.write(f"Within latency: {eval_results['within_latency_rate']:.2%}\n")
            f.write("\n")
            
            if 'baselines' in results['evaluation']:
                f.write("BASELINE COMPARISONS\n")
                baselines = results['evaluation']['baselines']
                for name, baseline in baselines.items():
                    improvement = eval_results['avg_reward'] - baseline['avg_reward']
                    f.write(f"vs {name}: {improvement:+.2f} reward improvement\n")
        
        f.write(f"\nReport generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

# Export essential utility functions
__all__ = [
    'load_form_template',
    'calculate_cost_savings',
    'estimate_monthly_costs',
    'analyze_tool_efficiency',
    'format_time_duration',
    'save_experiment_config',
    'load_experiment_results',
    'create_summary_report'
]