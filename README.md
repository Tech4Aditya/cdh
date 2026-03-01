# Delhi Sprinkler Dispatch 

A lightweight web app prototype for Delhi water-sprinkler drivers to:

- Automatically get routed to the highest AQI hotspot within 5 km.
- Mark a watering run complete and reduce hotspot AQI.
- Track each driver's daily contribution as impact points.
- Generate an end-of-day leaderboard.


## How contribution scoring works

- Every completed run asks for AQI reduction achieved (e.g. 20 points).
- The entered reduction is added to that driver's score.
- Leaderboard is sorted by highest total impact points.
- Use **Close day and reset** to clear all scores for a new day.

> Notes:
> - AQI data in this prototype is seeded sample data for Delhi zones.
> - Driver leaderboard is stored in browser `localStorage` for demo purposes.
