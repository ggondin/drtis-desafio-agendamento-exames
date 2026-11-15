import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../src/database.js";

describe("Proteção de senhas", () => {
  it("verifica a senha correta sem armazená-la em texto puro", () => {
    const password = "Senha-ficticia-123";
    const hash = hashPassword(password);

    assert.equal(hash.includes(password), false);
    assert.equal(verifyPassword(password, hash), true);
  });

  it("rejeita senha incorreta", () => {
    const hash = hashPassword("Senha-ficticia-123");
    assert.equal(verifyPassword("outra-senha", hash), false);
  });

  it("gera hashes diferentes para a mesma senha e valida ambos", () => {
    const password = "Senha-ficticia-123";
    const first = hashPassword(password);
    const second = hashPassword(password);

    assert.notEqual(first, second);
    assert.equal(verifyPassword(password, first), true);
    assert.equal(verifyPassword(password, second), true);
  });
});
