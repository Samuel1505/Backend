#!/usr/bin/env python3
"""
AI Forecast Service (BE-4)
Generates probabilistic forecasts for prediction markets using machine learning
"""

import json
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import pickle
import os
from datetime import datetime

class MarketForecastModel:
    def __init__(self, model_path=None):
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = model_path or './models/forecast_model.pkl'
        self.load_model()
    
    def load_model(self):
        """Load trained model from file"""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.model = model_data.get('model')
                    self.scaler = model_data.get('scaler', StandardScaler())
                print(f"Model loaded from {self.model_path}", file=sys.stderr)
            except Exception as e:
                print(f"Error loading model: {e}", file=sys.stderr)
                self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        else:
            print(f"Model file not found, using default model", file=sys.stderr)
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
    
    def extract_features(self, market_data):
        """
        Extract features from market data for prediction
        Features: volume, liquidity, time_to_resolution, price_volatility, etc.
        """
        features = []
        
        # Volume features
        volume = float(market_data.get('totalVolume', 0))
        features.append(volume)
        features.append(np.log1p(volume))  # Log transform
        
        # Liquidity features
        liquidity = float(market_data.get('totalLiquidity', 0))
        features.append(liquidity)
        features.append(np.log1p(liquidity))
        
        # Time features
        resolution_time = market_data.get('resolutionTime')
        if resolution_time:
            try:
                resolution_dt = datetime.fromisoformat(resolution_time.replace('Z', '+00:00'))
                now = datetime.now(resolution_dt.tzinfo)
                time_to_resolution = (resolution_dt - now).total_seconds() / 3600  # hours
                features.append(time_to_resolution)
                features.append(max(0, time_to_resolution))  # Clamped
            except:
                features.append(0)
                features.append(0)
        else:
            features.append(0)
            features.append(0)
        
        # Price features
        prices = market_data.get('prices', [])
        if prices and len(prices) > 0:
            prices_array = np.array([float(p) for p in prices])
            features.append(np.mean(prices_array))  # Mean price
            features.append(np.std(prices_array))    # Price volatility
            features.append(np.max(prices_array) - np.min(prices_array))  # Price range
            features.append(len(prices))  # Number of outcomes
        else:
            features.extend([0, 0, 0, 2])  # Default values
        
        # Historical data features (if available)
        history = market_data.get('history', [])
        if history and len(history) > 0:
            recent_prices = [h.get('prices', []) for h in history[-10:]]  # Last 10 snapshots
            if recent_prices:
                price_changes = []
                for i in range(1, len(recent_prices)):
                    if len(recent_prices[i]) > 0 and len(recent_prices[i-1]) > 0:
                        change = np.mean([float(recent_prices[i][j]) - float(recent_prices[i-1][j]) 
                                        for j in range(min(len(recent_prices[i]), len(recent_prices[i-1])))])
                        price_changes.append(change)
                
                if price_changes:
                    features.append(np.mean(price_changes))  # Average price change
                    features.append(np.std(price_changes))   # Price change volatility
                else:
                    features.extend([0, 0])
            else:
                features.extend([0, 0])
        else:
            features.extend([0, 0])
        
        return np.array(features).reshape(1, -1)
    
    def predict(self, market_data):
        """
        Generate forecast for a market
        Returns probability distribution over outcomes
        """
        try:
            # Extract features
            features = self.extract_features(market_data)
            
            # Scale features
            features_scaled = self.scaler.fit_transform(features)
            
            # Get number of outcomes
            num_outcomes = market_data.get('outcomeCount', 2)
            prices = market_data.get('prices', [])
            
            if len(prices) > 0:
                num_outcomes = len(prices)
            
            # If model is not trained, return uniform distribution
            if self.model is None or not hasattr(self.model, 'predict_proba'):
                # Return probabilities based on current prices (LMSR prices are already probabilities)
                if prices and len(prices) > 0:
                    probabilities = [float(p) for p in prices]
                    # Normalize to ensure they sum to 1
                    total = sum(probabilities)
                    if total > 0:
                        probabilities = [p / total for p in probabilities]
                    else:
                        probabilities = [1.0 / num_outcomes] * num_outcomes
                else:
                    probabilities = [1.0 / num_outcomes] * num_outcomes
                
                confidence = 0.5  # Low confidence for untrained model
            else:
                # Use model to predict
                try:
                    proba = self.model.predict_proba(features_scaled)[0]
                    
                    # Map to outcomes
                    if len(proba) >= num_outcomes:
                        probabilities = proba[:num_outcomes].tolist()
                    else:
                        # Pad with uniform distribution
                        probabilities = proba.tolist()
                        while len(probabilities) < num_outcomes:
                            probabilities.append(0.0)
                        # Normalize
                        total = sum(probabilities)
                        if total > 0:
                            probabilities = [p / total for p in probabilities]
                    
                    # Calculate confidence based on prediction entropy
                    entropy = -sum(p * np.log2(p + 1e-10) for p in probabilities if p > 0)
                    max_entropy = np.log2(num_outcomes)
                    confidence = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 0.5
                except Exception as e:
                    print(f"Prediction error: {e}", file=sys.stderr)
                    # Fallback to uniform
                    probabilities = [1.0 / num_outcomes] * num_outcomes
                    confidence = 0.3
            
            # Build forecast response
            forecast = []
            outcome_names = market_data.get('outcomes', [])
            
            for i, prob in enumerate(probabilities):
                outcome_name = outcome_names[i].get('name', f'Outcome {i}') if isinstance(outcome_names, list) and i < len(outcome_names) else f'Outcome {i}'
                forecast.append({
                    'outcome': outcome_name,
                    'outcomeId': i,
                    'probability': float(prob),
                    'confidence': float(confidence)
                })
            
            return {
                'forecast': forecast,
                'confidence': float(confidence),
                'modelVersion': '1.0.0',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating forecast: {e}", file=sys.stderr)
            # Return default forecast
            num_outcomes = market_data.get('outcomeCount', 2)
            return {
                'forecast': [
                    {
                        'outcome': f'Outcome {i}',
                        'outcomeId': i,
                        'probability': 1.0 / num_outcomes,
                        'confidence': 0.3
                    }
                    for i in range(num_outcomes)
                ],
                'confidence': 0.3,
                'modelVersion': '1.0.0',
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }

def main():
    """Main entry point for the forecast service"""
    try:
        # Read market data from stdin
        input_data = sys.stdin.read()
        market_data = json.loads(input_data)
        
        # Create model and generate forecast
        model = MarketForecastModel()
        forecast = model.predict(market_data)
        
        # Output forecast as JSON
        print(json.dumps(forecast))
    except Exception as e:
        error_response = {
            'error': str(e),
            'forecast': [],
            'confidence': 0.0
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()





