/**
 * js/vendor/zod-lite.js
 * ------------------------------------------------------------------
 * ВАЖНО, почему этот файл вообще существует (правки от 19.09.2026, п.8
 * плана — форма оформления заказа): техничка требует валидацию формы
 * именно через библиотеку Zod ("построить на zod validation"). Настоящий
 * npm-пакет zod (или его CDN-сборка, например jsdelivr/unpkg) скачать
 * прямо сейчас не получилось — у этой рабочей песочницы нет доступа ни к
 * реестру npm, ни к внешним CDN (организационная политика egress-прокси
 * блокирует оба хоста, проверено). Поэтому здесь — маленькая, но НАМЕРЕННО
 * API-совместимая замена: тот же паттерн вызовов, что и у настоящего Zod
 * (`z.object({...}).safeParse(data)`, `z.string().min(n, msg)`, `.regex(...)`,
 * `z.enum([...])`, `.optional()`), тот же формат результата
 * (`{success:true,data}` / `{success:false,error:{issues:[{path,message}]}}`).
 * `js/checkout.js` написан ИСКЛЮЧИТЕЛЬНО через этот публичный API — благодаря
 * этому подмена на настоящий Zod в будущем (как только появится доступ к
 * npm/CDN, либо на этапе переезда на Next.js с нормальной сборкой) — это
 * ЗАМЕНА ОДНОГО ЭТОГО ФАЙЛА (или подключение настоящего пакета вместо
 * него), без единой правки в js/checkout.js. Если решишь сделать это
 * раньше — просто подключи настоящий zod так, чтобы он выставлял тот же
 * глобальный объект `window.Zod = { z: <настоящий z> }`, и убери
 * подключение этого файла из build/template.html.
 *
 * Поддержано ровно то, что реально нужно для формы оформления заказа
 * (п.8) — это НЕ универсальная замена Zod для любых других целей.
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  // ---- Базовый тип: у любого "шэйпа" есть safeParse(value) ----------------
  function makeType(rules, meta) {
    meta = meta || {};

    function safeParse(value) {
      var issues = [];

      if ((value === undefined || value === null || value === '') && meta.optional) {
        return { success: true, data: value === undefined ? undefined : value };
      }

      if (meta.kind === 'string') {
        if (typeof value !== 'string') {
          issues.push({ path: [], message: meta.requiredMessage || 'Обязательное поле' });
        } else {
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var result = rule(value);
            if (result !== true) {
              issues.push({ path: [], message: result });
              break; // одной ошибки на поле достаточно — как и обычный Zod по умолчанию (abortEarly не настраивали)
            }
          }
        }
      } else if (meta.kind === 'enum') {
        if (meta.values.indexOf(value) === -1) {
          issues.push({ path: [], message: meta.message || 'Обязательное поле' });
        }
      }

      if (issues.length) {
        return { success: false, error: { issues: issues } };
      }
      return { success: true, data: value };
    }

    return {
      _rules: rules,
      _meta: meta,
      safeParse: safeParse,
      min: function (n, message) {
        var newRules = rules.concat(function (v) {
          return v.trim().length >= n ? true : message;
        });
        return makeType(newRules, meta);
      },
      regex: function (re, message) {
        var newRules = rules.concat(function (v) {
          return re.test(v) ? true : message;
        });
        return makeType(newRules, meta);
      },
      optional: function () {
        return makeType(rules, Object.assign({}, meta, { optional: true }));
      }
    };
  }

  function string() {
    return makeType([], { kind: 'string' });
  }

  function enumType(values, message) {
    return makeType([], { kind: 'enum', values: values, message: message });
  }

  // ---- z.object({...}) — собирает несколько полей в одну схему ------------
  function objectType(shape) {
    return {
      safeParse: function (data) {
        var issues = [];
        var out = {};
        Object.keys(shape).forEach(function (key) {
          var fieldType = shape[key];
          var result = fieldType.safeParse(data[key]);
          if (result.success) {
            out[key] = result.data;
          } else {
            result.error.issues.forEach(function (issue) {
              issues.push({ path: [key].concat(issue.path), message: issue.message });
            });
          }
        });
        if (issues.length) {
          return { success: false, error: { issues: issues } };
        }
        return { success: true, data: out };
      }
    };
  }

  window.Zod = {
    z: {
      string: string,
      enum: enumType,
      object: objectType
    }
  };
})();
