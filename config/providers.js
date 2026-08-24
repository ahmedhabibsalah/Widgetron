const providers = {
  ollama: require("../providers/ollamaProvider"),
};

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

module.exports = { getProvider };
