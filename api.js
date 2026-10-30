const fs = require("fs");
const path = require("path");

function getFileContent(file) {
    try {
        return fs.readFileSync(
            path.join(__dirname, file),
            "utf8"
        );
    } catch {
        return "Plik nie istnieje";
    }
}

module.exports = {
    getFileContent
};
