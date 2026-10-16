cmake_minimum_required(VERSION 3.16)
project(novahub LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(OpenCV REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(httplib REQUIRED)

add_executable(novahub src/main.cpp)
target_include_directories(novahub PRIVATE ${OpenCV_INCLUDE_DIRS})
target_link_libraries(novahub PRIVATE ${OpenCV_LIBS} nlohmann_json::nlohmann_json httplib::httplib)
