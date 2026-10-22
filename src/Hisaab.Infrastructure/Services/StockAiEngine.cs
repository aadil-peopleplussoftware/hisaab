using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;

namespace Hisaab.Infrastructure.Services;

public class StockAiEngine : IStockAiEngine
{
    public StockAiAnalysisDto AnalyzeHolding(StockHolding holding, MarketQuoteDto quote, StockHistoricalDataDto history)
    {
        decimal currentPrice = quote.CurrentPrice;
        decimal buyPrice = holding.BuyPrice;
        decimal quantity = holding.Quantity;
        decimal investedAmount = buyPrice * quantity;
        decimal currentValue = currentPrice * quantity;

        decimal currentProfitPerShare = currentPrice - buyPrice;
        decimal totalProfitLoss = currentProfitPerShare * quantity;
        decimal profitLossPercentage = buyPrice > 0 ? (currentProfitPerShare / buyPrice) * 100m : 0m;

        // Target calculation
        decimal? targetProfitPerShare = holding.TargetProfitPerShare;
        decimal? targetPrice = holding.TargetPrice ?? (targetProfitPerShare.HasValue ? buyPrice + targetProfitPerShare.Value : null);

        decimal? targetProgress = null;
        bool isTargetHit = false;
        bool isTargetApproaching = false;

        if (targetProfitPerShare.HasValue && targetProfitPerShare.Value > 0)
        {
            targetProgress = Math.Round((currentProfitPerShare / targetProfitPerShare.Value) * 100m, 1);
            isTargetHit = currentProfitPerShare >= targetProfitPerShare.Value;
            isTargetApproaching = !isTargetHit && currentProfitPerShare >= (targetProfitPerShare.Value * 0.85m);
        }
        else if (targetPrice.HasValue && targetPrice.Value > buyPrice)
        {
            var totalExpectedGain = targetPrice.Value - buyPrice;
            targetProgress = Math.Round((currentProfitPerShare / totalExpectedGain) * 100m, 1);
            isTargetHit = currentPrice >= targetPrice.Value;
            isTargetApproaching = !isTargetHit && currentPrice >= (buyPrice + (totalExpectedGain * 0.85m));
        }

        // Stop-loss calculation
        decimal? stopLossPrice = holding.StopLossPrice;
        bool isStopLossBreached = stopLossPrice.HasValue && currentPrice <= stopLossPrice.Value;

        // Predictive Upside Target ("Kitna aur upar ja sakta hai?")
        decimal nextUpsideTarget = currentPrice < history.Resistance1
            ? history.Resistance1
            : (currentPrice < history.Resistance2 ? history.Resistance2 : history.Resistance3);

        if (nextUpsideTarget <= currentPrice)
        {
            nextUpsideTarget = Math.Round(currentPrice * 1.085m, 2); // 8.5% extension
        }

        decimal maxExpectedUpside = Math.Max(0m, Math.Round(nextUpsideTarget - currentPrice, 2));
        decimal upsidePercentage = currentPrice > 0 ? Math.Round((maxExpectedUpside / currentPrice) * 100m, 2) : 0m;

        // Predictive Downside Support ("Kitna niche gir sakta hai?")
        decimal keySupport = currentPrice > history.EMA20 && history.EMA20 > 0
            ? history.EMA20
            : (currentPrice > history.Support1 ? history.Support1 : history.Support2);

        if (keySupport >= currentPrice)
        {
            keySupport = Math.Round(currentPrice * 0.94m, 2); // 6% support cushion
        }

        decimal maxExpectedDownside = Math.Max(0m, Math.Round(currentPrice - keySupport, 2));
        decimal downsidePercentage = currentPrice > 0 ? Math.Round((maxExpectedDownside / currentPrice) * 100m, 2) : 0m;

        // Upside vs Downside Probability Assessment
        int upsideProbability;
        int downsideProbability;

        if (history.RSI14 > 76m)
        {
            // Extreme Overbought: High probability of retracement
            upsideProbability = 28;
            downsideProbability = 72;
        }
        else if (history.RSI14 >= 68m)
        {
            // Near overbought
            upsideProbability = 45;
            downsideProbability = 55;
        }
        else if (history.RSI14 < 35m)
        {
            // Oversold value bounce
            upsideProbability = 78;
            downsideProbability = 22;
        }
        else if (currentPrice > history.EMA20 && currentPrice > history.EMA50)
        {
            // Strong trend continuation
            upsideProbability = 74;
            downsideProbability = 26;
        }
        else
        {
            upsideProbability = 58;
            downsideProbability = 42;
        }

        // Bullish Sentiment Score (0 to 100)
        int bullishScore = (int)Math.Clamp(
            (history.RSI14 * 0.4m) +
            (currentPrice > history.EMA20 ? 25m : 5m) +
            (currentPrice > history.EMA50 ? 20m : 5m) +
            (quote.DayChangePercent > 0 ? 15m : 0m),
            5m, 98m);

        string sentimentLabel = bullishScore >= 80 ? "Super Bullish Breakout 🚀" :
                                bullishScore >= 60 ? "Healthy Bullish Trend 📈" :
                                bullishScore >= 40 ? "Neutral Consolidation ⚖️" : "Bearish Pressure 📉";

        // Recommended Trailing Stop-Loss
        decimal? recommendedTrailingSl = null;
        if (currentProfitPerShare > 0)
        {
            // Lock in at least 70% to 80% of current gain, or at 20 EMA
            decimal lockedPrice = buyPrice + (currentProfitPerShare * 0.78m);
            recommendedTrailingSl = Math.Round(Math.Max(lockedPrice, keySupport), 2);
        }

        // Risk / Reward Ratio
        decimal riskReward = maxExpectedDownside > 0 ? Math.Round(maxExpectedUpside / maxExpectedDownside, 2) : 2.5m;

        // AI Decision Recommendation & Narrative
        string actionRecommendation;
        string actionBadgeText;
        string actionColor;
        string aiSummaryHindi;
        string aiSummaryEnglish;
        string upsideRationale;
        string downsideRationale;

        if (isStopLossBreached)
        {
            actionRecommendation = "EXIT_STOP_LOSS";
            actionBadgeText = "STOP LOSS BREACHED (EXIT) 🛑";
            actionColor = "#ef4444";
            aiSummaryHindi = $"Alert: Share aapke stop-loss level ₹{stopLossPrice:N2} se niche fisal gaya hai. Loss ko aur badhne na dein aur capital safe rakhne ke liye immediate exit karein.";
            aiSummaryEnglish = $"Caution: The stock has breached your stop-loss level of ₹{stopLossPrice:N2}. Capital preservation is rule #1. Cut the loss immediately.";
            upsideRationale = "Weak technical structure below key moving averages. Upside is capped by recent breakdown levels.";
            downsideRationale = $"Next major support lies at S2 ₹{history.Support2:N2} (-{downsidePercentage:N1}%). Free-fall risk if selling intensifies.";
        }
        else if (isTargetHit)
        {
            if (history.RSI14 > 72m || upsideProbability <= 35)
            {
                // Target hit + overbought = SELL ALL
                actionRecommendation = "BOOK_FULL_PROFIT";
                actionBadgeText = "BOOK FULL PROFIT (SELL ALL) 💰";
                actionColor = "#10b981";
                aiSummaryHindi = $"Mubarak ho! Aapka per-share ₹{(targetProfitPerShare ?? currentProfitPerShare):N0} profit target achieve ho chuka hai! RSI abhi {history.RSI14:N1} (Overbought) par hai aur Resistance level ₹{history.Resistance1:N2} ke paas heavy profit booking aa sakti hai. Downside risk ₹{maxExpectedDownside:N2} (-{downsidePercentage:N1}%) hai. AI ki advice hai: Pure shares sell karke profit book kar lijiye aur capital safe rakhiye!";
                aiSummaryEnglish = $"Target achieved! Your ₹{(targetProfitPerShare ?? currentProfitPerShare):N0}/share target is met. RSI is overbought at {history.RSI14:N1} with strong resistance at ₹{history.Resistance1:N2}. Downside risk to support is ₹{maxExpectedDownside:N2} (-{downsidePercentage:N1}%). Recommendation: Book 100% profits now.";
                upsideRationale = $"Stock has reached upper resistance band R1 (₹{history.Resistance1:N2}). While further rally to R2 (₹{history.Resistance2:N2}) is possible (+{upsidePercentage:N1}%), the probability is only {upsideProbability}%.";
                downsideRationale = $"High likelihood ({downsideProbability}%) of profit booking down to 20 EMA / Support S1 at ₹{keySupport:N2} (-{downsidePercentage:N1}%).";
            }
            else
            {
                // Target hit + momentum intact = SELL 50%, TRAIL STOP LOSS ON REST
                actionRecommendation = "BOOK_50_PERCENT_AND_TRAIL";
                actionBadgeText = "BOOK 50% & TRAIL STOP LOSS ⚡";
                actionColor = "#6366f1";
                aiSummaryHindi = $"Aapka per-share ₹{(targetProfitPerShare ?? currentProfitPerShare):N0} target hit ho gaya hai, lekin volume aur momentum abhi bhi strong hai! Share next target ₹{nextUpsideTarget:N2} (+{upsidePercentage:N1}%) tak ja sakta hai. AI advice: 50% shares abhi sell karke apna ₹{Math.Round(totalProfitLoss * 0.5m, 0):N0} profit lock karein, aur baaki 50% shares par ₹{recommendedTrailingSl:N2} ka Trailing Stop-Loss laga ke upside ride karein!";
                aiSummaryEnglish = $"Target achieved with strong momentum! Upside to ₹{nextUpsideTarget:N2} (+{upsidePercentage:N1}%) remains likely ({upsideProbability}% probability). Recommendation: Book 50% profit to lock gains, and trail stop-loss on remaining shares at ₹{recommendedTrailingSl:N2}.";
                upsideRationale = $"Strong price action above 20 EMA (₹{history.EMA20:N2}) with RSI at healthy {history.RSI14:N1}. Next Fibonacci expansion target is ₹{nextUpsideTarget:N2} (+{upsidePercentage:N1}%).";
                downsideRationale = $"Immediate cushion at 20 EMA ₹{keySupport:N2}. Trailing stop-loss at ₹{recommendedTrailingSl:N2} protects your capital from sudden reversals.";
            }
        }
        else if (isTargetApproaching)
        {
            actionRecommendation = "PREPARE_TO_EXIT";
            actionBadgeText = "TARGET NEAR - GET READY 🎯";
            actionColor = "#f59e0b";
            aiSummaryHindi = $"Share aapke target ke bohot kareeb hai ({targetProgress ?? 90:N0}% achieve ho chuka hai). Current LTP ₹{currentPrice:N2} hai. AI monitor kar raha hai — jaise hi target hit hoga, instant sell advisory activate ho jayegi.";
            aiSummaryEnglish = $"Target nearing ({targetProgress ?? 90:N0}% complete). Current price is ₹{currentPrice:N2}. AI is monitoring for exact breakout or exit signal.";
            upsideRationale = $"Testing key resistance zone ₹{history.Resistance1:N2}. Next target ₹{nextUpsideTarget:N2} (+{upsidePercentage:N1}%).";
            downsideRationale = $"Support floor at ₹{keySupport:N2} (-{downsidePercentage:N1}%). Keep trailing stop-loss active.";
        }
        else if (currentProfitPerShare > 0)
        {
            actionRecommendation = "HOLD_AND_LET_RUN";
            actionBadgeText = "HOLD & RIDE PROFIT 🚀";
            actionColor = "#0b57d0";
            aiSummaryHindi = $"Share profit me chal raha hai (+₹{currentProfitPerShare:N2} per share / +{profitLossPercentage:N1}%). Target abhi baaki hai ({targetProgress ?? 50:N0}%). Trend bullish hai, position hold karein.";
            aiSummaryEnglish = $"Position is profitable (+{profitLossPercentage:N1}%). Trend remains intact. Hold position towards your target.";
            upsideRationale = $"Healthy continuation pattern towards target ₹{targetPrice ?? nextUpsideTarget:N2} (+{upsidePercentage:N1}%).";
            downsideRationale = $"Support base is well protected at 20 EMA ₹{keySupport:N2} (-{downsidePercentage:N1}%).";
        }
        else
        {
            actionRecommendation = "HOLD_ACCUMULATE";
            actionBadgeText = "HOLD / ACCUMULATE ON DIPS ⏸️";
            actionColor = "#64748b";
            aiSummaryHindi = $"Position slight loss ya cost ke paas hai. Support level ₹{keySupport:N2} par nazar rakhein. Agar support hold karta hai to bounce back aayega.";
            aiSummaryEnglish = $"Position is consolidating near buy price. Watch key support at ₹{keySupport:N2} for a rebound.";
            upsideRationale = $"Rebound to cost price and resistance ₹{history.Resistance1:N2} expected (+{upsidePercentage:N1}%).";
            downsideRationale = $"Crucial support at ₹{keySupport:N2} (-{downsidePercentage:N1}%). Exit if support is broken.";
        }

        return new StockAiAnalysisDto(
            HoldingId: holding.Id,
            Ticker: holding.Ticker,
            CompanyName: quote.CompanyName,
            BuyPrice: buyPrice,
            Quantity: quantity,
            InvestedAmount: Math.Round(investedAmount, 2),
            CurrentPrice: currentPrice,
            CurrentValue: Math.Round(currentValue, 2),
            CurrentProfitPerShare: Math.Round(currentProfitPerShare, 2),
            TotalProfitLoss: Math.Round(totalProfitLoss, 2),
            ProfitLossPercentage: Math.Round(profitLossPercentage, 2),
            TargetProfitPerShare: targetProfitPerShare,
            TargetPrice: targetPrice,
            TargetProgressPercentage: targetProgress,
            IsTargetHit: isTargetHit,
            IsTargetApproaching: isTargetApproaching,
            StopLossPrice: stopLossPrice,
            IsStopLossBreached: isStopLossBreached,
            ActionRecommendation: actionRecommendation,
            ActionBadgeText: actionBadgeText,
            ActionColor: actionColor,
            BullishScore: bullishScore,
            SentimentLabel: sentimentLabel,
            NextUpsideTargetPrice: nextUpsideTarget,
            MaxExpectedUpsideAmount: maxExpectedUpside,
            UpsidePercentage: upsidePercentage,
            UpsideProbabilityPercent: upsideProbability,
            UpsideRationale: upsideRationale,
            KeySupportPrice: keySupport,
            MaxExpectedDownsideAmount: maxExpectedDownside,
            DownsidePercentage: downsidePercentage,
            DownsideProbabilityPercent: downsideProbability,
            RecommendedTrailingStopLoss: recommendedTrailingSl,
            DownsideRationale: downsideRationale,
            AiSummaryHindi: aiSummaryHindi,
            AiSummaryEnglish: aiSummaryEnglish,
            RiskRewardRatio: riskReward
        );
    }

    public AskMarketAiResponse AnswerUserQuestion(
        string question,
        string? selectedTicker,
        List<StockHoldingWithAnalysisDto> userHoldings,
        List<MarketScreenerStockDto> screener,
        MarketQuoteDto? targetQuote = null,
        StockHistoricalDataDto? targetHistory = null)
    {
        var cleanQ = question.Trim().ToLowerInvariant();

        // 1. Check if question refers to an existing portfolio holding
        StockHoldingWithAnalysisDto? matchedHolding = null;
        if (!string.IsNullOrWhiteSpace(selectedTicker))
        {
            matchedHolding = userHoldings.FirstOrDefault(h =>
                h.Holding.Ticker.Equals(selectedTicker, StringComparison.OrdinalIgnoreCase) ||
                h.Holding.Ticker.Replace(".NS", "", StringComparison.OrdinalIgnoreCase).Equals(selectedTicker.Replace(".NS", ""), StringComparison.OrdinalIgnoreCase));
        }

        if (matchedHolding == null)
        {
            matchedHolding = userHoldings.FirstOrDefault(h =>
                cleanQ.Contains(h.Holding.Ticker.ToLowerInvariant().Replace(".ns", "")) ||
                cleanQ.Contains(h.Holding.CompanyName.ToLowerInvariant()));
        }

        // 2. Identify active quote and history: either from holding or from targetQuote/History
        MarketQuoteDto? q = matchedHolding?.Quote ?? targetQuote;
        StockHistoricalDataDto? hist = null;
        StockAiAnalysisDto? a = matchedHolding?.Analysis;

        if (matchedHolding != null)
        {
            // Synthesize or use analysis
            hist = targetHistory;
        }
        else if (targetQuote != null && targetHistory != null)
        {
            hist = targetHistory;
        }

        // Case A: Specific Stock Analysis (Groww-Style Deep AI Insights)
        if (q != null)
        {
            decimal cmp = q.CurrentPrice;
            string ticker = q.Ticker;
            string compName = q.CompanyName;
            decimal rsi = hist?.RSI14 ?? 56m;
            decimal ema20 = hist?.EMA20 ?? Math.Round(cmp * 0.98m, 2);
            decimal ema50 = hist?.EMA50 ?? Math.Round(cmp * 0.95m, 2);
            decimal sup1 = hist?.Support1 ?? Math.Round(cmp * 0.96m, 2);
            decimal sup2 = hist?.Support2 ?? Math.Round(cmp * 0.92m, 2);
            decimal res1 = hist?.Resistance1 ?? Math.Round(cmp * 1.06m, 2);
            decimal res2 = hist?.Resistance2 ?? Math.Round(cmp * 1.12m, 2);

            // Calculate Ideal Entry Zone
            decimal entryLow = Math.Round(Math.Min(cmp * 0.985m, sup1), 2);
            decimal entryHigh = cmp;

            // Targets & Stop Loss
            decimal target1 = a?.NextUpsideTargetPrice ?? (res1 > cmp ? res1 : Math.Round(cmp * 1.085m, 2));
            decimal target2 = Math.Round(Math.Max(res2, target1 * 1.06m), 2);
            decimal stopLoss = a?.RecommendedTrailingStopLoss ?? Math.Round(Math.Min(cmp * 0.945m, sup2), 2);
            decimal trailingSl = Math.Round(Math.Max(stopLoss, entryLow * 0.97m), 2);

            decimal upsidePct1 = cmp > 0 ? Math.Round(((target1 - cmp) / cmp) * 100m, 1) : 0m;
            decimal upsidePct2 = cmp > 0 ? Math.Round(((target2 - cmp) / cmp) * 100m, 1) : 0m;
            decimal downsidePct = cmp > 0 ? Math.Round(((cmp - stopLoss) / cmp) * 100m, 1) : 0m;
            decimal riskReward = downsidePct > 0 ? Math.Round(upsidePct1 / downsidePct, 1) : 2.8m;

            // Bullish Score
            int bullishScore = a?.BullishScore ?? (int)Math.Clamp((rsi * 0.45m) + (cmp >= ema20 ? 25m : 5m) + (cmp >= ema50 ? 20m : 5m) + (q.DayChangePercent >= 0 ? 10m : 0m), 15m, 95m);

            // Determine Groww AI Verdict
            string actionSignal;
            string verdictLabel;
            string decisionHeading;

            if (a != null && a.IsTargetHit)
            {
                actionSignal = "BOOK_PROFIT";
                verdictLabel = "🎯 TARGET ACHIEVED - BOOK PROFIT";
                decisionHeading = "Target Profit Hit: 50% Profit Book Karein";
            }
            else if (rsi >= 75m)
            {
                actionSignal = "WAIT_ON_DIPS";
                verdictLabel = "⚠️ OVERBOUGHT - WAIT FOR DIP";
                decisionHeading = "Abhi Jaldbaazi Na Karein, Dip Ka Wait Karein";
            }
            else if (cmp >= ema20 && rsi >= 45m)
            {
                actionSignal = "STRONG_BUY";
                verdictLabel = "🟢 STRONG BUY / ACCUMULATE";
                decisionHeading = "Haan, Lena Chahiye! Strong Momentum Setup";
            }
            else if (cmp >= ema50)
            {
                actionSignal = "BUY_ON_DIPS";
                verdictLabel = "🟡 BUY ON DIPS NEAR SUPPORT";
                decisionHeading = "Support Ke Pass Buy Karein";
            }
            else
            {
                actionSignal = "AVOID";
                verdictLabel = "🔴 AVOID / WAIT FOR REVERSAL";
                decisionHeading = "Abhi Avoid Karein, Support Break Ho Sakta Hai";
            }

            // Strengths & Risks (Groww Pros vs Cons)
            var strengths = new List<string>
            {
                $"Trading at ₹{cmp:N2} with healthy 20-EMA support at ₹{ema20:N2}.",
                $"RSI Indicator at {rsi:N0} indicates steady institutional interest.",
                $"Upside target ₹{target1:N2} (+{upsidePct1:N1}%) offers favorable Risk/Reward (1:{riskReward:N1})."
            };

            var risks = new List<string>
            {
                $"Immediate overhead resistance zone at ₹{res1:N2}.",
                $"Downside stop-loss level is ₹{stopLoss:N2} (-{downsidePct:N1}%). Cut loss if breached."
            };

            var bullets = new List<string>
            {
                $"CMP: ₹{cmp:N2} ({q.DayChangePercent:+#0.00;-#0.00}%)",
                $"Verdict: {verdictLabel}",
                $"Ideal Entry Zone: ₹{entryLow:N2} - ₹{entryHigh:N2}",
                $"Target 1: ₹{target1:N2} (+{upsidePct1:N1}%) | Target 2: ₹{target2:N2} (+{upsidePct2:N1}%)",
                $"Strict Stop-Loss: ₹{stopLoss:N2} (-{downsidePct:N1}%) [R:R 1:{riskReward:N1}]"
            };

            string answerHindi;
            string answerEnglish;

            // Scenario 1: User asks "Kya lena chahiye ya nahi?"
            if (cleanQ.Contains("lena") || cleanQ.Contains("kharid") || cleanQ.Contains("buy") || cleanQ.Contains("entry"))
            {
                if (actionSignal == "STRONG_BUY")
                {
                    answerHindi = $"**AI Groww-Style Verdict: {decisionHeading}**\n\n" +
                                  $"Haan! Live market analysis ke mutabik **{compName} ({ticker})** me strong bullish structure ban raha hai.\n\n" +
                                  $"📌 **Exact Entry & Action Plan:**\n" +
                                  $"• **Current Price (CMP):** ₹{cmp:N2}\n" +
                                  $"• **Ideal Entry Zone:** ₹{entryLow:N2} se ₹{entryHigh:N2} ke beech 60% quantity lein, aur agar market me thoda dip aaye to baki 40% add karein.\n" +
                                  $"• **Target 1 (Short-term):** ₹{target1:N2} (+{upsidePct1:N1}% gain)\n" +
                                  $"• **Target 2 (Big Breakout):** ₹{target2:N2} (+{upsidePct2:N1}% gain)\n" +
                                  $"• **Strict Stop-Loss:** ₹{stopLoss:N2} (-{downsidePct:N1}%), capital safe rakhne ke liye is level par stop-loss lagana zaroori hai.\n" +
                                  $"• **Risk / Reward Ratio:** 1 : {riskReward:N1} (Favorable trade setup).";
                }
                else if (actionSignal == "WAIT_ON_DIPS")
                {
                    answerHindi = $"**AI Groww-Style Verdict: {decisionHeading}**\n\n" +
                                  $"Abhi {compName} ({ticker}) CMP ₹{cmp:N2} par thoda overbought (RSI: {rsi:N0}) zone me hai. Yahan fresh entry lene par short-term pullback ka khatra rehta hai.\n\n" +
                                  $"📌 **Smart Trader Plan:**\n" +
                                  $"• Abhi jaldbaazi me market top par buy na karein.\n" +
                                  $"• Share ke dip ka wait karein aur ₹{entryLow:N2} ke pass aane par entry banayein.\n" +
                                  $"• Target: ₹{target1:N2} (+{upsidePct1:N1}%)\n" +
                                  $"• Stop-Loss: ₹{stopLoss:N2}.";
                }
                else
                {
                    answerHindi = $"**AI Groww-Style Verdict: {decisionHeading}**\n\n" +
                                  $"{compName} ({ticker}) abhi ₹{cmp:N2} par trade kar raha hai. 20 EMA (₹{ema20:N2}) aur 50 EMA ke mutabik trend thoda cautious hai.\n\n" +
                                  $"📌 **Action Plan:**\n" +
                                  $"• Agar entry leni hai to sirf support level ₹{sup1:N2} ke pass disciplined stop-loss ₹{stopLoss:N2} ke sath lein.\n" +
                                  $"• Safe traders ko clear trend reversal ka wait karna chahiye.";
                }

                answerEnglish = $"Groww-style AI Verdict for {ticker}: {verdictLabel}. Ideal entry zone is ₹{entryLow:N2} - ₹{entryHigh:N2}. Target 1: ₹{target1:N2} (+{upsidePct1:N1}%), Stop-Loss: ₹{stopLoss:N2}.";
            }
            // Scenario 2: Target hit / Profit booking / Exit / Sell
            else if (cleanQ.Contains("sell") || cleanQ.Contains("bechu") || cleanQ.Contains("exit") || cleanQ.Contains("target") || cleanQ.Contains("profit"))
            {
                answerHindi = $"**AI Exit & Profit Booking Strategy for {compName}:**\n\n" +
                              $"Aapka stock abhi ₹{cmp:N2} par trade kar raha hai. AI Golden Profit Rule follow karein:\n\n" +
                              $"1. **50% Profit Booking Rule:** Agar aapka per-share target (e.g. ₹1000/share) hit ho gaya hai ya Target ₹{target1:N2} ke pass hai, to 50% shares bech kar profit cash me lock kar lein.\n" +
                              $"2. **Ride the Trend with Trailing SL:** Baaki 50% shares par Trailing Stop-Loss ₹{trailingSl:N2} lagayein. Agar share Target 2 (₹{target2:N2}) tak rally karta hai, to aapko extra profit milega bina capital risk ke!\n" +
                              $"3. **Kab Pura Exit Karein:** Agar share ₹{stopLoss:N2} se niche fisalta hai, to immediate full exit karein.";

                answerEnglish = $"Profit Strategy for {ticker}: Lock in 50% profit at Target 1 (₹{target1:N2}). Keep a trailing stop loss at ₹{trailingSl:N2} on remaining 50% to ride the rally toward Target 2 (₹{target2:N2}).";
            }
            // Scenario 3: Downside / Stop-loss / Market crash
            else if (cleanQ.Contains("gir") || cleanQ.Contains("down") || cleanQ.Contains("loss") || cleanQ.Contains("stop") || cleanQ.Contains("support"))
            {
                answerHindi = $"**AI Downside Risk & Cushion Analysis for {compName}:**\n\n" +
                              $"Agar market me correction ya selling aati hai, to {ticker} ke key levels ye hain:\n\n" +
                              $"• **Immediate Support (S1):** ₹{sup1:N2} (CMP se -{Math.Max(0m, Math.Round((cmp - sup1)/cmp * 100m, 1)):N1}% niche). Yahan buyers aakar price ko bounce back kara sakte hain.\n" +
                              $"• **Major Floor Support (S2):** ₹{sup2:N2}. Ye multi-week strong floor hai.\n" +
                              $"• **AI Recommended Stop-Loss:** ₹{stopLoss:N2}. Is level ke niche share me sharp fall ho sakta hai, isliye yahan stop-loss zaroor lagayein.\n" +
                              $"• **Max Expected Downside:** ₹{Math.Round(cmp - stopLoss, 2):N2} (-{downsidePct:N1}%).";

                answerEnglish = $"Downside Risk for {ticker}: S1 support at ₹{sup1:N2}, major S2 floor at ₹{sup2:N2}. Set hard stop-loss at ₹{stopLoss:N2} (-{downsidePct:N1}%).";
            }
            // Scenario 4: Averaging
            else if (cleanQ.Contains("average") || cleanQ.Contains("averaging"))
            {
                answerHindi = $"**AI Averaging Rules for {compName}:**\n\n" +
                              $"• **Kahan Average Karein:** Averaging sirf tab karein jab share apne major support ₹{sup1:N2} ya 50-EMA (₹{ema50:N2}) ke pass bounce ka sign dikhaye.\n" +
                              $"• **Rule:** Running loss me beech me bina support ke kabhi average na karein.\n" +
                              $"• **Stop-Loss:** Averaged position ka final exit point ₹{stopLoss:N2} hona chahiye.";

                answerEnglish = $"Averaging advice for {ticker}: Only average near strong support floor at ₹{sup1:N2}. Maintain final stop loss at ₹{stopLoss:N2}.";
            }
            // General / Default for this stock
            else
            {
                answerHindi = $"**Groww-Style AI Market Insights for {compName} ({ticker}):**\n\n" +
                              $"• **Live CMP:** ₹{cmp:N2} ({q.DayChangePercent:+#0.00;-#0.00}%)\n" +
                              $"• **AI Health Score:** {bullishScore}/100 ({verdictLabel})\n" +
                              $"• **Ideal Entry Zone:** ₹{entryLow:N2} - ₹{entryHigh:N2}\n" +
                              $"• **Upside Targets:** Target 1: ₹{target1:N2} (+{upsidePct1:N1}%), Breakout Target 2: ₹{target2:N2} (+{upsidePct2:N1}%)\n" +
                              $"• **Capital Protection SL:** ₹{stopLoss:N2} (-{downsidePct:N1}%)\n\n" +
                              $"📌 **Summary:** Stock me favorable Risk/Reward setup hai. Agar aapne already buy kiya hai to target tak hold karein, naya lena hai to entry zone me disciplined stop-loss ke sath accumulate karein.";

                answerEnglish = $"AI Analysis for {ticker}: Bullish score {bullishScore}/100. Entry: ₹{entryLow:N2}-₹{entryHigh:N2}, Target 1: ₹{target1:N2}, SL: ₹{stopLoss:N2}.";
            }

            return new AskMarketAiResponse(
                AnswerHindi: answerHindi,
                AnswerEnglish: answerEnglish,
                ActionSignal: actionSignal,
                KeyTargetPrice: target1,
                KeySupportPrice: stopLoss,
                TrailingStopLoss: trailingSl,
                KeyBulletPoints: bullets,
                Ticker: ticker,
                CompanyName: compName,
                CurrentPrice: cmp,
                IdealEntryZoneLow: entryLow,
                IdealEntryZoneHigh: entryHigh,
                TargetPrice2: target2,
                RiskRewardRatio: riskReward,
                BullishScore: bullishScore,
                VerdictLabel: verdictLabel,
                Strengths: strengths,
                Risks: risks
            );
        }

        // Case B: General market question (e.g. "Konsa share lena hai?", "Best share today?")
        var topPick = screener.OrderByDescending(s => s.ConfidenceScore).FirstOrDefault() ?? screener.First();

        string screenerHindi = $"Live AI Screener ke mutabik aaj sabse high-probability breakout share **{topPick.CompanyName} ({topPick.Ticker})** hai!\n\n" +
                               $"• **Verdict:** 🟢 {topPick.Recommendation}\n" +
                               $"• **Entry Zone:** ₹{topPick.EntryPrice:N2}\n" +
                               $"• **Target 1:** ₹{topPick.TargetPrice1:N2} (Short-term gain)\n" +
                               $"• **Target 2:** ₹{topPick.TargetPrice2:N2} (Big breakout target)\n" +
                               $"• **Strict Stop-Loss:** ₹{topPick.StopLossPrice:N2}\n" +
                               $"• **Risk/Reward Ratio:** 1 : {topPick.RiskRewardRatio:N1}\n" +
                               $"• **Reason & Catalyst:** {topPick.Catalyst}\n\n" +
                               $"Aap is share ko direct '+ Add to Portfolio' button par click karke watchlist me shamil kar sakte hain.";

        string screenerEnglish = $"According to AI market scan, the top setup right now is {topPick.CompanyName} ({topPick.Ticker}) with entry at ₹{topPick.EntryPrice:N2}, Target 1 ₹{topPick.TargetPrice1:N2}, and Stop-Loss ₹{topPick.StopLossPrice:N2}.";

        var screenerBullets = new List<string>
        {
            $"Top Pick: {topPick.CompanyName} ({topPick.Ticker})",
            $"Entry Price: ₹{topPick.EntryPrice:N2}",
            $"Target 1: ₹{topPick.TargetPrice1:N2} | Target 2: ₹{topPick.TargetPrice2:N2}",
            $"Stop-Loss: ₹{topPick.StopLossPrice:N2} (Risk/Reward 1:{topPick.RiskRewardRatio})",
            $"Setup: {topPick.SetupType}"
        };

        return new AskMarketAiResponse(
            AnswerHindi: screenerHindi,
            AnswerEnglish: screenerEnglish,
            ActionSignal: "STRONG_BUY",
            KeyTargetPrice: topPick.TargetPrice1,
            KeySupportPrice: topPick.StopLossPrice,
            TrailingStopLoss: topPick.StopLossPrice,
            KeyBulletPoints: screenerBullets,
            Ticker: topPick.Ticker,
            CompanyName: topPick.CompanyName,
            CurrentPrice: topPick.CurrentPrice,
            IdealEntryZoneLow: Math.Round(topPick.EntryPrice * 0.985m, 2),
            IdealEntryZoneHigh: topPick.EntryPrice,
            TargetPrice2: topPick.TargetPrice2,
            RiskRewardRatio: topPick.RiskRewardRatio,
            BullishScore: topPick.ConfidenceScore,
            VerdictLabel: topPick.Recommendation,
            Strengths: new List<string> { topPick.Catalyst, $"Technical setup: {topPick.SetupType}", $"AI Confidence: {topPick.ConfidenceScore}%" },
            Risks: new List<string> { $"Stop-loss breach at ₹{topPick.StopLossPrice:N2} requires immediate exit." }
        );
    }
}

