from pathlib import Path

from wasmtime import (
    Config,
    Engine,
    Store,
    Module,
    Instance
)


class WasmRuntime:

    def __init__(self):

        # 1. Configure Wasmtime
        config = Config()
        config.consume_fuel = True

        # 2. Create Engine
        self.engine = Engine(config)

        # 3. Compile trusted calculator module once
        wasm_path = (
            Path(__file__).resolve().parent.parent
            / "api"
            / "calculator.wat"
        )

        self.module = Module.from_file(
            self.engine,
            str(wasm_path)
        )

    def execute(self, a: int, b: int):

        # 4. Create a fresh Store for this execution
        store = Store(self.engine)

        # 5. Set execution budget
        store.set_fuel(100_000)

        # 6. Set resource limits
        store.set_limits(
            memory_size=64 * 1024 * 1024,
            table_elements=10_000,
            instances=1,
            tables=4,
            memories=1
        )

        # 7. Instantiate module
        instance = Instance(
            store,
            self.module,
            []
        )

        # 8. Access exported function
        add = instance.exports(store)["add"]

        # 9. Execute
        result = add(store, a, b)

        return result