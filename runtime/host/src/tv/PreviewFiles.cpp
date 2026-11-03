#include "PreviewFiles.h"

#include "../logging/Log.h"

#include <app_common.h>

#include <cstdlib>
#include <filesystem>
#include <fstream>

namespace rntizen {

namespace {

std::filesystem::path dataDirectory() {
  char *path = app_get_data_path();
  if (path == nullptr) return std::filesystem::temp_directory_path() / "rn-tizen-data";
  std::filesystem::path directory(path);
  std::free(path);
  return directory;
}

void writeFile(const char *name, const std::string &contents) {
  const auto directory = dataDirectory();
  std::error_code ignored;
  std::filesystem::create_directories(directory, ignored);
  std::ofstream file(directory / name, std::ios::binary | std::ios::trunc);
  file << contents;
  if (!file) log(LogLevel::Warning, std::string("Smart Hub preview: cannot write ") + (directory / name).string());
}

} // namespace

void writePreviewFile(const std::string &samsungJson) {
  writeFile("preview.json", samsungJson);
}

void writePreviewSource(const std::optional<std::string> &sourceJson) {
  if (sourceJson) {
    writeFile("preview-source.json", *sourceJson);
    return;
  }
  std::error_code ignored;
  std::filesystem::remove(dataDirectory() / "preview-source.json", ignored);
  std::filesystem::remove(dataDirectory() / "preview-fetched-at", ignored);
}

} // namespace rntizen
