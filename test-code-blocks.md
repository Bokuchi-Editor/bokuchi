# コードブロックの行間テスト

## JavaScript コードブロック

```javascript
function calculateSum(a, b) {
  const result = a + b;
  console.log(`Sum of ${a} and ${b} is ${result}`);
  return result;
}

const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, num) => acc + num, 0);
console.log(`Total sum: ${sum}`);
```

## Python コードブロック

```python
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# フィボナッチ数列を生成
fib_sequence = [fibonacci(i) for i in range(10)]
print(f"Fibonacci sequence: {fib_sequence}")
```

## インラインコード

この文章には `const variable = "value"` のようなインラインコードが含まれています。

また、`function()` や `array.map()` のような関数呼び出しもインラインで表示されます。

## 複数行のコードブロック

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserById(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }
}
```
