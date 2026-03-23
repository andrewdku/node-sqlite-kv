<h1 align="center">node-sqlite-kv</h1>

> Key-value store with node:sqlite (Node.js v22.5.0 or higher is required)

## Installation

```bash
npm install node-sqlite-kv
# or
yarn add node-sqlite-kv
# or
pnpm add node-sqlite-kv
# or
bun add node-sqlite-kv
```

## Example

```js
import { KVSync } from "node-sqlite-kv";

const kv = new KVSync({
    // sqlite journal mode
    // default DELETE for in-memory stores,
    // and WAL for persistent ones
    journalMode: "WAL",

    // whether the database is open upon
    // being instantiated, defaults to true
    open: true,

    // use :memory: for in-memory storage
    // path is optional, defaults to :memory:
    path: "./data.sqlite",
});

// set values
kv.set("number", 123);
kv.set("string", "hello world");
kv.set("boolean", true);
kv.set("null", null);
kv.set("array", [1, 2, 3]);
kv.set("object", { settings: { theme: "dark" } });
kv.set("date", new Date());

// get values
kv.get("number"); // 123
kv.get("string"); // "hello world"
kv.get("boolean"); // true
kv.get("null"); // null
kv.get("array"); // [1, 2, 3]
kv.get("object"); // { settings: { theme: "dark" } }
kv.get("date"); // Date

// update values
kv.set("number", 999);
kv.get("number"); // 999

// delete values
kv.delete("array"); // [1, 2, 3]
kv.get("array"); // null

// list all entries
kv.all();
// [
//      { key: "string", value: "hello world" },
//      { key: "number", value: 999 },
//      { key: "boolean", value: true },
//      // ...
// ];

// transactions
kv.set("user:1", { name: "Andrew", age: 19 });
kv.set("user:2", { name: "Josh", age: 22 });
kv.set("user:3", { name: "Gabe", age: 20 });

// ...store what changed in transactions
const { oldValues, newValues } = kv.transaction((tx) => {
    tx.set("user:1", { name: "Andrew", age: 20 });
    tx.set("user:4", { name: "Kris", age: 21 });
    tx.delete("user:2");
});

// delete all entries
kv.clear();

// close the database
kv.close();
```

### TS Generics Example

```ts
import { KVSync } from "node-sqlite-kv";
const kv = new KVSync({ path: "./data.sqlite" });

interface User {
    name: string;
}

kv.set("user", { name: "Andrew" });
kv.get<User>("user"); // User | null

kv.set("example", 123);
kv.get<number>("example"); // number | null
```

## Contributing

[pnpm](https://pnpm.io) is used throughout this project for packages and scripts. Pull requests are always welcome. For more major changes, please open an issue to discuss what you wish to change.

## License

[MIT](LICENSE)
