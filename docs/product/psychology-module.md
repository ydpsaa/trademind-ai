# Psychology Module

Stage 14 adds the foundation for behavioral trading analytics inside TradeMind AI.

## Emotion Tracker

Manual trades can now store psychology context:

- emotion before entry
- emotion after exit
- confidence level
- stress level
- FOMO score
- discipline note

The goal is to connect execution quality with the trader's behavioral state.

## Discipline Score

The Discipline Score preview uses a simple 0-100 model:

- risk control
- emotion balance
- revenge avoidance
- documentation consistency
- time discipline placeholder

This is a product foundation, not a final coaching model. Later stages can persist periodic scores into `discipline_scores`.

## Revenge Index Foundation

The Revenge Index detector looks for a losing trade followed by another trade within five minutes. It increases the risk score when the next trade uses higher risk, larger position size, or emotions such as revenge, FOMO, or greed.

Detected events are displayed in memory for now. Automatic insertion into `revenge_events` can be added after the model is reviewed.

## AI Review Context

AI Trade Review now receives trade psychology context. The local rules engine adjusts psychology score and recommendations when FOMO, revenge, high stress, or stable confidence are recorded.

Real AI prompts include psychology fields and explicitly instruct the model to avoid medical or mental health diagnosis. Analysis must remain trading-behavior focused.

## Future Weekly AI Report

A future stage will generate weekly psychology reports using:

- emotion distribution
- discipline score trend
- revenge patterns
- repeated mistakes
- risk-control consistency

No medical diagnosis, therapy, or mental health claims are part of this product.
