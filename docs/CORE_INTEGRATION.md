# DAXIS — Integration handoff

## Проверенный контекст

Репозиторий GitHub: `ydpsaa/trademind-ai`, ветка `main` (чтение отдельных файлов). Проверены `AGENTS.md`, `package.json`, `tsconfig.json`, `src/app/(app)/backtest-lab/page.tsx`, `src/app/(app)/strategies/page.tsx`, `src/lib/backtest/types.ts`, `src/lib/strategies/types.ts`, `src/lib/strategies/validation.ts`. Существующий Next.js 16.3.1, TypeScript 5, Supabase. Локальная рабочая копия владельца и состояние действующей БД не были проверены. Никакие файлы GitHub не изменены, миграции не применены.

## 1. Подключение и контроль регрессий

Сохранить изменения владельца, проверить `git status`, прочитать актуальные инструкции (в `AGENTS.md` предписано читать документацию Next из установленного пакета перед изменениями Next). Создать отдельную ветку `feat/quant-core` от актуального HEAD. Перенести только новые пути (проверить, что они не существуют). Запустить TypeScript- и node:test-проверки этого пакета. Далее `npm run lint`, `npm run build` и существующие тесты проекта. Добавить `.quant-build/` в `.gitignore`. Не публиковать автоматически.

## 2. Strategy Builder — НЕ смешивать текущие правила с QuantSpec

Сейчас `StrategyRules` содержит ICT/SMC поля; `normalizeStrategyRules()` возвращает только известные поля. Простое добавление `model` в `rules_json` может быть потеряно. Предлагается отдельная версионированная конфигурация `strategy_quant_configs` либо проверенное discriminated union в существующем schema. Не перезаписывать ICT-стратегии. `QuantSpec` из registry — внутренний контракт, не validator для JSON. На сервере ввести схему проверки модели, параметров, списка активов, типов, границ, прав владельца. Market Making в registry свечного backtest не допускается. UI: модель/параметры/интервал/рынок/long-short/грубая экспозиция, отдельные labels для риска на стоп. Никаких фальшивых сигналов.

## 3. Market Data — обязательный шлюз для historical

Подключить read-only поставщика котировок (провайдер выбирается отдельно); сохранять dataset ID, provider, instrument specification, venue, timezone/UTC, timeframe, interval, adjustment policy, data version/hash. Bar.time — единая UTC шкала. Проверять полноту ожидаемых сессий, пропуски, дубли, stale data, корпоративные действия для акций, futures rolls, корректировку цены, bid/ask, торговые часы, валюту, FX, tick size и contract multiplier. `validateMarket()` здесь проверяет только синхронность/формат OHLC и не заменяет проверку качества внешних данных. Для pairs/momentum не заполнять пропуски неизвестными будущими данными и не подменять universe текущим списком акций при прошлых датах. Незакрытые свечи не подавать на вход моделей.

## 4. Backtest Lab — отдельная research ветка результатов

Сейчас `BacktestReport.engineType` допускает только `simulated`, а существующая страница исключает из real preview записи `simulated`; неизвестный `engine_type` может ошибочно выглядеть реальным. Не писать результаты Quant Core в существующую таблицу `backtests`, пока не изменены все типы, фильтры, detail pages, dashboard и save paths. Безопасный вариант: `quant_backtest_runs` с `user_id`, `strategy_id`, `dataset_id`, `engine_version`, `spec_snapshot`, `execution_config`, `mode`, `validation_state`, `result_json`, `created_at`, `input_hash`, `status`, `error_code`. Только server-side verified provenance; клиент не может объявить данные historical. UI states: sandbox, historical-unvalidated, validated-research, stale, failed. Ни один статус не означает гарантированную прибыль. Предпочтительно использовать jobs с лимитами времени/размера и отменой. Существующие страницы не менять до тестов.

В ядре result.fills — изменения позиции, не завершённые сделки. Не считать количество fills как winrate или totalTrades. Для Journal/Prop добавить trade lifecycle accounting (lot IDs, entry/exit, partial fills, realized fees, первоначальный R, funding/swaps). Для пары объединить legs в один episode ID. Показатели Sharpe/Sortino требуют известной частоты и annualization, Portfolio drawdown — частоты mark-to-market. Для FX/CFD нужны contract multipliers, base/quote conversion и правила маржи; пока backtest работает только с линейной единицей в единой валюте. Округление лотов, trailing/SL/TP внутри свечи и gap-policy интегрировать отдельно. Gross — exposure target, не guaranteed risk. Не отправлять сделки.

## 5. Историческая валидация (не выполнена)

Зафиксировать спецификацию модели и universe до тестирования, параметрический поиск только внутри train folds, validation для выбора, неизменяемый out-of-sample. Walk-forward с warmup без утечки будущего; сделки на границе фолдов закрывать/переносить по объявленной политике; сохранять все кандидаты, не только лучший. Сопоставить buy-and-hold/flat/простую альтернативу, включить realistic costs, stress fees/slippage, разных рынков и режимов. Проверить sample size, uncertainty, robustness, serial dependence, turnover, capacity. Pairs: rolling beta stability, stationarity/cointegration on train, multiple-testing correction, borrow and synchronization; OLS один недостаточен. Market Making: отдельный L2/tick replay, queue/latency, inventory unwind, adverse selection, exchange fees, order cancellations; оставлять sandbox. Не считать положительные synthetic returns подтверждением стратегии. Monte Carlo IID — baseline; добавить block bootstrap и stress scenarios для реальных серий. Confidence interval данного Monte Carlo учитывает только sampling error симуляции, не неопределённость рынка.

## 6. Prop Intelligence & Risk integration

Сопоставить реальные, закрытые, net-R сделки (источник, ID, первоначальный риск, комиссия) с существующим Journal. Не рассчитывать net-R, если риск неизвестен; не вычитать комиссии дважды. `tradeStatistics()` принимает готовые net R. Для `evaluateStaticProp()` нужен список дней в часовом поясе/границах конкретной фирмы, close и подтверждённый intraday min equity. Текущая модель: общий floor от initial; дневной floor = предыдущее close equity − daily allowance от initial; equality = breach; breach проверяется до target; min/max days = число переданных торговых дней, НЕ календарные сроки. Закрытие дня без минимума не подтверждает проход. Данные должны быть полными; реальные правила могут использовать начальный balance, EOD trailing, intraday trailing, различную логику reset, equity/balance, выплат и time restrictions. Ввести versioned rule snapshots по официальным условиям фирмы, граничные тесты и сверку с statements. `passed-model` относится только к данной гипотетической модели и не подтверждает фирму. `exactSymmetricPass` и `monteCarlo` не учитывают daily floor, не смешивать с реальной вероятностью. Сформировать адаптер в Prop Center после rule engine.

Risk: server-side instrument metadata и FX conversion; связать позиционное количество с Pre-Trade Checklist и открытыми коррелированными позициями, оставшимся headroom; не менять допустимые лимиты через AI. Нет принудительного контроля брокерских сделок при read-only.

## 7. Database, authorization и AI

Новые таблицы только после инвентаризации фактической схемы Supabase, в отдельной тестовой среде. Включить RLS, `TO authenticated`, owner policies с `USING` и `WITH CHECK` где применимо, составные связи с ownership (`user_id`, foreign ID), серверная верификация JWT. Не доверять user_id из запроса. Доступ к results только владельцу. Не хранить raw broker keys; никаких service role keys в браузере; read-only integrations. Все расчёты серверные, versioned, provenance и audit log; AI получает проверенные метрики + ограничения + идентификаторы артефактов, не генерирует проценты и не выполняет ордера. Использовать локальный fallback AI Review. Сохранить исходный результат отдельно от интерпретации.

## 8. Приёмка / Release gate

P0: technical tests, exact oracle, no lookahead, costs, ownership and isolation, missing-data states, no fake performance, no execution endpoints, regression lint/build. P1: dataset connector, research storage, UI in Strategy Builder/Backtest Lab, historical validation, realistic execution and Prop daily rule integration. P2: pairs validation, L2 market-making sandbox, stress tests, walk-forward, calibration, monitoring. Не открывать production signals до независимой проверки модели, качества данных и risk gating. Отдельный approval перед публикацией. Не назначать `Validated` по факту прохождения unit tests.

## Источник и архитектурные решения

Пользовательская инфографика Main quant trading strategies задаёт 6 формул/семейств, но не полный набор торговых правил. Дополнительно выбраны входы/выходы z-score и breakout, OLS fit, исполнение на следующей свече, ограничение номинальной экспозиции, sandbox market-making, статическая модель проп-лимитов. Это инженерные допущения, не утверждения автора изображения и не финансовые рекомендации.
