const fs = require('fs');
const base_folder = "/Users/illusion/dev/Illusi/mobile/";
const build_path = base_folder + `builds/${process.argv[2] ?? "build"}.tar.gz`;
const dir = fs.readdirSync(base_folder);
const build_file = dir.find(file_name => /build-\d+\.tar\.gz/.test(file_name));
if(build_file === undefined) throw "Couldn't find build file";
fs.cpSync(base_folder + build_file, build_path, {force: true});
fs.rmSync(base_folder + build_file, {force: true});