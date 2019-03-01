declare const require: any;
const context = require.context('./', false, /^(?!.*?\.async).*(\.js|\.ts)$/);
const fileNames = context.keys().filter(item => {
  return item !== './index.ts';
});
export let reducers = {};
export let sagas = {};

fileNames.forEach(key => {
  let model = context(key);
  if (model.default) {
    model = model.default;
  }
  const modelName = model.modelName;
  if (!modelName) {
    return;
  }
  reducers[modelName] = model.reducer;
  if (model.sagas) {
    sagas[modelName] = model.sagas;
  }
});
