# NovaHub (C++)

C++17 backend for the VIPER workflow UI. Requires CMake, OpenCV, nlohmann-json and cpp-httplib
(`brew install cmake opencv nlohmann-json cpp-httplib`).

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/novahub        # http://127.0.0.1:8000 (override with PORT)
```

Endpoints: `GET /api/health`, `POST /api/upload` (multipart `files`), `GET /static/*` (serves `outputs/`).
