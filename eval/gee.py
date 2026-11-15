# H1 of docs/valutazione/piano.md § 0: logistic GEE on correct answers, condition as the only effect,
# exchangeable correlation within the scenario, Mancl-DeRouen bias-reduced covariance, t with scenarios - 1
# degrees of freedom. Reads trials as JSON on stdin ({y, ariadne, scenario}), writes the probability
# difference (ariadne - prima) by the delta method. Run with: uv run --with statsmodels python eval/gee.py
import json
import sys

import numpy as np
import statsmodels.api as sm
from scipy import stats

MARGIN = float(sys.argv[1]) if len(sys.argv) > 1 else 0.1

rows = json.load(sys.stdin)
y = np.array([r["y"] for r in rows], dtype=float)
x = sm.add_constant(np.array([r["ariadne"] for r in rows], dtype=float))
groups = np.array([r["scenario"] for r in rows])
n = len(set(groups))

fit = sm.GEE(y, x, groups=groups, family=sm.families.Binomial(), cov_struct=sm.cov_struct.Exchangeable()).fit(cov_type="bias_reduced")
b0, b1 = fit.params
cov = np.asarray(fit.cov_params())
expit = lambda v: 1 / (1 + np.exp(-v))
p0, p1 = expit(b0), expit(b0 + b1)
grad = np.array([p1 * (1 - p1) - p0 * (1 - p0), p1 * (1 - p1)])
se = float(np.sqrt(grad @ cov @ grad))
diff = float(p1 - p0)
df = n - 1
lower = diff - stats.t.ppf(0.975, df) * se
p = float(stats.t.sf((diff + MARGIN) / se, df)) if se > 0 else (0.0 if diff > -MARGIN else 1.0)
ok = bool(np.all(np.isfinite([b0, b1, se])) and abs(b0) < 15 and abs(b1) < 15)
print(json.dumps({"method": "gee-bias-reduced", "ok": ok, "prima": float(p0), "ariadne": float(p1), "diff": diff, "se": se, "df": df, "lower": float(lower), "p": p}))
