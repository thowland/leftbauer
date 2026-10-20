# Tournament report

Generated with `npm run tournament -- --games=10000 --seed=7` on 2026-10-20. Sharp samples 80 deals per card decision (time budget 250 ms). Teams swap seats every game and the first dealer rotates. "Calls" counts hands where the team made trump; "Made" is the share of those it made; "Euchres" counts euchres the team inflicted; "Loners" is made / attempted. The interval is a 95% confidence interval on the win rate.

## Findings

| Match (10,000 games each) | Winner | Win rate (95% CI) |
| --- | --- | --- |
| Sharp vs Standard | Sharp | 66.3% (65.4–67.2%) |
| Standard vs Casual | Standard | 66.3% (65.4–67.2%) |
| Sharp vs Casual | Sharp | 78.0% (77.2–78.8%) |
| Partner (Sharp) vs Soopy (Standard) | Partner | 70.4% (69.5–71.3%) |
| Partner (Sharp) vs Shrubs (Standard) | Partner | 68.7% (67.8–69.6%) |
| Partner (Sharp) vs Rusty (Standard) | Partner | 72.6% (71.7–73.5%) |
| Partner (Sharp) vs Smooth (Standard) | Partner | 66.8% (65.8–67.7%) |

- **The difficulty ordering holds, by a wide margin.** Each step up wins about two games in three against the level below. Sharp beats Casual nearly four games in five.
- **Sharp's edge is all in card play.** Bidding is identical at both levels, so the two teams call about equally often: 56,398 against 55,474 calls. Yet Sharp makes 87.9% of its calls against Standard's 79.1%. It marches more often (16.1% of calls against 10.9%) and euchres 70% more (11,615 against 6,834).
- **The partner at Sharp beats every Standard opponent.** Its largest margins are against the personas whose style costs them: Rusty's thin calls are made only 69.6% of the time, and Shrubs makes just 85% of its many loners (18,151 of 21,278). Soopy's cautious calling makes 86.7% of its calls, but too seldom to keep up.
- **The time budget never bound.** Each match used about 600 s across 10 processes. Sampling 160 deals instead of 80 added under one point (67.0% against 66.3% over 600 games), well within noise, so 80 is the setting.

## Sharp against Standard

```
10000 games, 112421 hands, 549 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
smooth (sharp)               66.3%   56398   87.9%   16.1%   11615  5271/5330
smooth (standard)            33.7%   55474   79.1%   10.9%    6834  4710/4771
```

smooth (sharp) wins 66.3% (95% CI 65.4%–67.2%): stronger. (665 s)

## Standard against Casual

```
10000 games, 112711 hands, 511 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
smooth (standard)            66.3%   52002   84.5%   12.0%   16718  4636/4664
smooth (casual)              33.7%   60198   72.2%    9.3%    8086  4162/4232
```

smooth (standard) wins 66.3% (95% CI 65.4%–67.2%): stronger. (3 s)

## Sharp against Casual

```
10000 games, 108059 hands, 477 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
smooth (sharp)               78.0%   49702   88.2%   16.9%   18210  4427/4471
smooth (casual)              22.0%   57880   68.5%    8.9%    5853  3879/4003
```

smooth (sharp) wins 78.0% (95% CI 77.2%–78.8%): stronger. (607 s)

## The partner (Sharp) against soopy (Standard)

```
10000 games, 114280 hands, 2130 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
partner (sharp)              70.4%   69258   87.2%   15.7%    5708  6050/6133
soopy (standard)             29.6%   42892   86.7%   16.2%    8884  2616/2624
```

partner (sharp) wins 70.4% (95% CI 69.5%–71.3%): stronger. (622 s)

## The partner (Sharp) against shrubs (Standard)

```
10000 games, 110117 hands, 531 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
partner (sharp)              68.7%   55238   87.8%   16.0%   12752  5131/5190
shrubs (standard)            31.3%   54348   76.5%    5.7%    6740  18151/21278
```

partner (sharp) wins 68.7% (95% CI 67.8%–69.6%): stronger. (606 s)

## The partner (Sharp) against rusty (Standard)

```
10000 games, 108476 hands, 74 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
partner (sharp)              72.6%   43352   89.4%   17.9%   19765  4340/4374
rusty (standard)             27.4%   65050   69.6%    8.9%    4579  3824/3873
```

partner (sharp) wins 72.6% (95% CI 71.7%–73.5%): stronger. (594 s)

## The partner (Sharp) against smooth (Standard)

```
10000 games, 112412 hands, 541 redeals
Team                          Wins   Calls    Made  Marches  Euchres    Loners
partner (sharp)              66.8%   56397   87.8%   16.0%   11676  5219/5281
smooth (standard)            33.2%   55474   79.0%   11.0%    6854  4732/4789
```

partner (sharp) wins 66.8% (95% CI 65.8%–67.7%): stronger. (610 s)
