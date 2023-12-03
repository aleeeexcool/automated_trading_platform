const proceeding: { [key in string]?: boolean } = {};
const waitingForResults: { [key in string]?: ((value: unknown) => void)[][] } =
  {};

export const getDebounced = async <T>(func: () => Promise<T>): Promise<T> => {
  const functionKey = func.name;
  const result = new Promise(function (resolve, reject) {
    if (!waitingForResults[functionKey]) {
      waitingForResults[functionKey] = [];
    }
    waitingForResults[functionKey]?.push([resolve, reject]);
  });
  if (!proceeding[functionKey]) {
    proceeding[functionKey] = true;
    func()
      .then((result) => {
        for (const [resolve, _reject] of waitingForResults[functionKey] ?? []) {
          resolve(result);
        }
      })
      .catch((err) => {
        for (const [_resolve, reject] of waitingForResults[functionKey] ?? []) {
          reject(err);
        }
      })
      .finally(() => {
        waitingForResults[functionKey] = [];
        proceeding[functionKey] = false;
      });
  }

  return result as Promise<T>;
};

