import assert from "node:assert/strict";
import { matchRepoByCwd } from "./paths.js";

const repos = [
  {
    nome: "es-api",
    path: "\\\\wsl.localhost\\Ubuntu-24.04\\home\\carolina-ferla\\projetos\\es-api",
  },
];

assert.ok(
  matchRepoByCwd(
    "\\\\wsl.localhost\\Ubuntu-24.04\\home\\carolina-ferla\\projetos\\es-api",
    repos,
  ),
);
assert.ok(
  matchRepoByCwd(
    "\\\\wsl.localhost\\Ubuntu-24.04\\home\\carolina-ferla\\projetos\\es-api\\src",
    repos,
  ),
);
assert.ok(
  matchRepoByCwd(
    "//wsl.localhost/Ubuntu-24.04/home/carolina-ferla/projetos/es-api",
    repos,
  ),
);
assert.ok(
  matchRepoByCwd("/home/carolina-ferla/projetos/es-api", repos),
);
assert.ok(
  matchRepoByCwd("/home/carolina-ferla/projetos/es-api/src", repos),
);
assert.equal(
  matchRepoByCwd("/home/carolina-ferla/projetos/other", repos),
  null,
);
assert.equal(
  matchRepoByCwd("\\\\wsl.localhost\\Ubuntu-24.04\\home\\carolina-ferla\\projetos\\other", repos),
  null,
);

console.log("check:paths ok — WSL UNC and /home cwd match");
