# Tournament report: Sprint 4

Generated with `npm run tournament -- --games=1000 --seed=7` on 2026-10-19. Each persona plays at Standard against the by-the-book baseline (Smooth); then Standard plays Casual. Teams swap seats every game and the first dealer rotates.

"Calls" counts hands where the team made trump; "Made" is the share of those it made; "Euchres" counts euchres the team inflicted; "Loners" is made / attempted.

```

1000 games, 11664 hands, 55 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
partner (standard)           50.9%    5865   83.0%   11.1%    1004   544/545
smooth (standard)            49.1%    5744   82.5%   11.5%     995   497/502

1000 games, 11890 hands, 212 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
soopy (standard)             45.9%    4514   90.4%   17.2%    1267   287/287
smooth (standard)            54.1%    7164   82.3%   11.3%     435   599/605

1000 games, 11439 hands, 52 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
shrubs (standard)            49.5%    5783   81.1%    5.9%     980  2023/2272
smooth (standard)            50.5%    5604   82.5%   11.4%    1095   482/487

1000 games, 11479 hands, 6 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
rusty (standard)             45.4%    6968   75.2%    9.5%     718   447/448
smooth (standard)            54.6%    4505   84.1%   12.9%    1727   418/424

1000 games, 11313 hands, 56 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
smooth (standard)            64.1%    5184   83.2%   11.7%    1689   475/477
smooth (casual)              35.9%    6073   72.2%    9.1%     871   438/445
```
