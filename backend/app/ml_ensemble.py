import numpy as np
import pandas as pd

class CustomEnsemble:
    def __init__(self, rf, xgb_model, lr, scaler):
        self.rf = rf
        self.xgb = xgb_model
        self.lr = lr
        self.scaler = scaler
        
    def predict_proba(self, X):
        if not isinstance(X, pd.DataFrame) and not isinstance(X, np.ndarray):
            X = np.array(X)
        X_scaled = self.scaler.transform(X)
        p1 = self.rf.predict_proba(X)
        p2 = self.xgb.predict_proba(X)
        p3 = self.lr.predict_proba(X_scaled)
        return (p1 + p2 + p3) / 3.0
        
    def predict(self, X):
        probas = self.predict_proba(X)
        return np.argmax(probas, axis=1)
