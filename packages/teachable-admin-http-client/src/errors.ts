export class TeachableAdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeachableAdminConfigError";
  }
}
