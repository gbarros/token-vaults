export type AddressBook = {
  tokens: { fakeUSD: string; fakeTIA: string };
  oracles: { aggregator: { pair: string; address: string }; builtOracle: string };
  morpho: {
    metaMorphoFactory: string;
    morphoBlueCore: string;
    oracleV2Factory: string;
    preLiquidationFactory: string;
    publicAllocator: string;
    adaptiveCurveIRM: string;
  };
  markets: {
    sandbox: {
      id: string;
      irm: string;
      lltv: string;
      loanToken: string;
      collateralToken: string;
      oracle: string;
    };
  };
  vaults: { page1Vault: string; customVault: string };
  sources: Record<string, string>;
};

export const addresses: AddressBook = {
  tokens: { fakeUSD: "0x4ad36b4beeb27cc2819f0ab4a495c7ae8dcf37f9", fakeTIA: "0x75bfd9db6034ad2598de27a5ae63c86b80897716" },
  oracles: { aggregator: { pair: "fakeTIA/fakeUSD", address: "0x254674123ff0c802a10c9814aeb8fda207d5fce6" }, builtOracle: "0x123766aa3762b3d5edaaa6c111ca5c704d614c78" },
  morpho: {
    // Sepolia addresses from Morpho docs
    metaMorphoFactory: "0x98CbFE4053ad6778E0E3435943aC821f565D0b03",
    morphoBlueCore: "0xd011EE229E7459ba1ddd22631eF7bF528d424A14",
    oracleV2Factory: "0xa6c843fc53aAf6EF1d173C4710B26419667bF6CD",
    preLiquidationFactory: "0x0000000000000000000000000000000000000000", // Not provided
    publicAllocator: "0xfd32fA2ca22c76dD6E550706Ad913FC6CE91c75D",
    adaptiveCurveIRM: "0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c",
  },
  markets: {
    sandbox: {
      id: "0xea92e61142cd5cffe448fc20f12bc9a8686b6ced67829651d7563e277bea118d",
      irm: "0x8C5dDCD3F601c91D1BF51c8ec26066010ACAbA7c",
      lltv: "860000000000000000", // 86% LLTV (18 decimals)
      loanToken: "0x4ad36b4beeb27cc2819f0ab4a495c7ae8dcf37f9",
      collateralToken: "0x75bfd9db6034ad2598de27a5ae63c86b80897716",
      oracle: "0x123766aa3762b3d5edaaa6c111ca5c704d614c78",
    },
  },
  vaults: { page1Vault: "", customVault: "" },
  sources: {
    morpho_docs: "https://docs.morpho.org/addresses",
  },
};