// global.d.ts

// This export {} is crucial. It signals to TypeScript that this file is a module.
// When a file is a module, `declare global` is used to modify the global scope.
export {};

declare global {
  // Augment the NodeJS namespace, which is typically provided by @types/node.
  // This adds expected environment variables to the existing ProcessEnv interface.
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      API_KEY?: string;
      // Add any other environment variables your application expects here.
    }

    // If your application uses other properties of the 'process' object,
    // like 'process.versions', you might need to augment the NodeJS.Process interface as well.
    // For example:
    // interface Process {
    //   versions?: { node?: string; [key: string]: string | undefined };
    // }
  }

  // The 'var process: AppProcess;' declaration has been removed.
  // The "Cannot redeclare block-scoped variable 'process'" error indicates that
  // 'process' is already declared in the global scope (likely by @types/node).
  // Augmenting NodeJS.ProcessEnv (and NodeJS.Process if needed) is the correct
  // way to add types for specific properties like 'env.API_KEY' in such cases.
  // This also makes 'globalThis.process' correctly typed if 'process' is a true global.
}
