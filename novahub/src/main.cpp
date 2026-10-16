// novahub/src/main.cpp
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <opencv2/core.hpp>

#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>

namespace fs = std::filesystem;
using json = nlohmann::json;

static const fs::path OUT = "outputs";
static const fs::path UPLOAD_DIR = OUT / "uploads";

static std::string unique_name(const std::string& original) {
    auto ts = std::chrono::steady_clock::now().time_since_epoch().count();
    return std::to_string(ts) + "_" + fs::path(original).filename().string();
}

static std::string static_url(const fs::path& p) {
    return "/static/" + fs::relative(p, OUT).generic_string();
}

static void set_error(httplib::Response& res, int status, const std::string& msg) {
    res.status = status;
    res.set_content(json{{"detail", msg}}.dump(), "application/json");
}

int main() {
    fs::create_directories(UPLOAD_DIR);

    httplib::Server svr;

    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "*"},
        {"Access-Control-Allow-Headers", "*"},
    });
    svr.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) { res.status = 204; });

    svr.set_mount_point("/static", OUT.string());

    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        res.set_content(json{{"status", "ok"}, {"opencv", CV_VERSION}}.dump(), "application/json");
    });

    svr.Post("/api/upload", [](const httplib::Request& req, httplib::Response& res) {
        json saved = json::array();
        for (const auto& f : req.form.get_files("files")) {
            fs::path path = UPLOAD_DIR / unique_name(f.filename);
            std::ofstream(path, std::ios::binary) << f.content;
            saved.push_back({{"name", f.filename}, {"path", path.generic_string()}, {"url", static_url(path)}});
        }
        if (saved.empty()) return set_error(res, 422, "No files uploaded");
        res.set_content(json{{"files", saved}}.dump(), "application/json");
    });

    const char* port_env = std::getenv("PORT");
    int port = port_env ? std::atoi(port_env) : 8000;
    std::cout << "NovaHub (C++) listening on http://127.0.0.1:" << port << std::endl;
    svr.listen("127.0.0.1", port);
    return 0;
}
