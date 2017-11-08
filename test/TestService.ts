import importClassesFromDirectories from '../src/util/DirectoryExportedClassesLoader';
import * as path from "path";

const serviceClses = importClassesFromDirectories([path.join('.', 'service/*')], ['.js']);

serviceClses.map((Cls: any) => new Cls(1, 2, 3)).forEach(console.log);
