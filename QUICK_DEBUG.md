# 🚨 Быстрая отладка поиска

## 1. Жёсткое обновление
```
Ctrl + F5
```

## 2. Откройте консоль
```
F12 → Console
```

## 3. Откройте страницу
```
http://localhost:8089/new#blocklists
```

## 4. Что ДОЛЖНО быть в консоли:

```
✅ Found search input element
✅ Search input listener attached
✅ All event listeners setup complete!
✅ BlocklistManager ready
✅ Loaded 42001 blocklist items
```

## 5. Введите в поиск: **test**

Должно появиться:
```
⌨️  INPUT EVENT TRIGGERED! Value: test
🔎 Search input: "test"
✅ Filter result: XXX items
```

---

## ❌ Если НЕТ логов:

### Проверка 1: Элемент существует?
В консоли выполните:
```javascript
document.getElementById('search-input')
```

Должно вернуться: `<input id="search-input" ...>`

Если `null` - элемент не создан!

### Проверка 2: Manager существует?
В консоли выполните:
```javascript
window.blocklistManager
```

Должно вернуться: `BlocklistManager {...}`

Если `undefined` - manager не создан!

### Проверка 3: Ручной вызов
В консоли выполните:
```javascript
window.blocklistManager.handleSearch('test')
```

Если появились логи - функция РАБОТАЕТ, проблема в event listener!

---

## 📋 Скопируйте и отправьте:

1. **ВСЕ** логи из консоли (Ctrl+A → Ctrl+C)
2. Результат команды: `document.getElementById('search-input')`
3. Результат команды: `window.blocklistManager`
4. Есть ли КРАСНЫЕ ошибки в консоли?

---

**Полная инструкция**: [DEBUG_SEARCH_PROBLEM.md](DEBUG_SEARCH_PROBLEM.md)
