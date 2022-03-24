declare module "crypto" {
  namespace webcrypto {
    var subtle: SubtleCrypto;
  }
}
