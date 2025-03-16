**Calculating Stellar Density using /rho**

This project is an extension of work done by Bald Eagle, Jackie Silver, marx, MattG, and Rollo Rhadium, measuring the change in stellar density (Scale Height) of the galaxy in different places. This can be used to generate a map of stellar density, and has implications with route finding and exploration.

The technique for measuring this is simple: Fly a column stretching from the galactic plane "up" about 1000 light years, measuring the stellar density ("rho") along the way.

This project is especially suited for console players, because it only uses the galaxy map and the nav panel.

**How to perform a density scan**

Before you begin, you'll need some way to record the values. Google Spreadsheets is ideal. I use a single spreadsheet, with a sheet tab for each density scan "column".

Open the galaxy map. You'll see coordinates on it that looks like this: "-390 : -27 : 4,280". The important one for us is the middle one, which measures "height" above the plane of the galaxy, or "Z". Pick a star on the map where Z = -20 and fly there. **IMPORTANT: CLEAR YOUR AUTOPILOT ONCE YOU ARRIVE! SETTING THE AUTOPILOT AFFECTS WHAT YOU SEE ON THE NAV PANEL, WHICH ALTERS THE RESULTS OF THE SCAN!**

Now you'll look at your nav panel. You'll see that it shows systems nearby. It tries to show systems within 20 light years, but if there are more than 50, it only shows the 50 nearest, including the system you are in. So the first thing you want to do is count them. If there are 50, then you are in a dense area of space. If there are less than 50, you are in a sparse area of space. An easy way to get a system count is to set the nav panel filter to show only systems, adding 1 to the count of systems (to add the system you are in).

If you are in a dense area of space, you will want to note the distance shown in the last system in your nav panel, which we'll call "r". This lets us estimate the density as rho = 50 / ((4pi/3) * (r^3)). If you are in the FleetComm discord, you can use the bot Jaques to calculate rho with the command "/rho dense: True distance: <distance>".

If you are in a sparse area of space, you will want to note the number of star systems in the nav panel (including the system you are in), which we'll call "n". This lets us estimate the density as rho = n / ((4pi/3) * (20^3)). If you are in the FleetComm discord, you can use Jaques again, with the command "/rho stars: <count>"