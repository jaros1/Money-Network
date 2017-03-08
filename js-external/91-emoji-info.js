// twemojis not replaced in strings when using https://twemoji.maxcdn.com/2/72x72/ as emoji resource
// used in moneyNetworkService.replace_emojis (post markdown-it emoji processing)
// created from testcase and simple list of failed wgets
var missing_twemojis = ["0023_fe0f_20e3", "002a_fe0f_20e3", "0030_fe0f_20e3", "0031_fe0f_20e3", "0032_fe0f_20e3", "0033_fe0f_20e3",
    "0034_fe0f_20e3", "0035_fe0f_20e3", "0036_fe0f_20e3", "0037_fe0f_20e3", "0038_fe0f_20e3", "0039_fe0f_20e3", "1f1e6_1f1e8",
    "1f1e6_1f1e9", "1f1e6_1f1ea", "1f1e6_1f1eb", "1f1e6_1f1ec", "1f1e6_1f1ee", "1f1e6_1f1f1", "1f1e6_1f1f2", "1f1e6_1f1f4",
    "1f1e6_1f1f6", "1f1e6_1f1f7", "1f1e6_1f1f8", "1f1e6_1f1f9", "1f1e6_1f1fa", "1f1e6_1f1fc", "1f1e6_1f1fd", "1f1e6_1f1ff",
    "1f1e7_1f1e6", "1f1e7_1f1e7", "1f1e7_1f1e9", "1f1e7_1f1ea", "1f1e7_1f1eb", "1f1e7_1f1ec", "1f1e7_1f1ed", "1f1e7_1f1ee",
    "1f1e7_1f1ef", "1f1e7_1f1f1", "1f1e7_1f1f2", "1f1e7_1f1f3", "1f1e7_1f1f4", "1f1e7_1f1f6", "1f1e7_1f1f7", "1f1e7_1f1f8",
    "1f1e7_1f1f9", "1f1e7_1f1fb", "1f1e7_1f1fc", "1f1e7_1f1fe", "1f1e7_1f1ff", "1f1e8_1f1e6", "1f1e8_1f1e8", "1f1e8_1f1e9",
    "1f1e8_1f1eb", "1f1e8_1f1ec", "1f1e8_1f1ed", "1f1e8_1f1ee", "1f1e8_1f1f0", "1f1e8_1f1f1", "1f1e8_1f1f2", "1f1e8_1f1f3",
    "1f1e8_1f1f4", "1f1e8_1f1f5", "1f1e8_1f1f7", "1f1e8_1f1fa", "1f1e8_1f1fb", "1f1e8_1f1fc", "1f1e8_1f1fd", "1f1e8_1f1fe",
    "1f1e8_1f1ff", "1f1e9_1f1ea", "1f1e9_1f1ec", "1f1e9_1f1ef", "1f1e9_1f1f0", "1f1e9_1f1f2", "1f1e9_1f1f4", "1f1e9_1f1ff",
    "1f1ea_1f1e6", "1f1ea_1f1e8", "1f1ea_1f1ea", "1f1ea_1f1ec", "1f1ea_1f1ed", "1f1ea_1f1f7", "1f1ea_1f1f8", "1f1ea_1f1f9",
    "1f1ea_1f1fa", "1f1eb_1f1ee", "1f1eb_1f1ef", "1f1eb_1f1f0", "1f1eb_1f1f2", "1f1eb_1f1f4", "1f1eb_1f1f7", "1f1ec_1f1e6",
    "1f1ec_1f1e7", "1f1ec_1f1e9", "1f1ec_1f1ea", "1f1ec_1f1eb", "1f1ec_1f1ec", "1f1ec_1f1ed", "1f1ec_1f1ee", "1f1ec_1f1f1",
    "1f1ec_1f1f2", "1f1ec_1f1f3", "1f1ec_1f1f5", "1f1ec_1f1f6", "1f1ec_1f1f7", "1f1ec_1f1f8", "1f1ec_1f1f9", "1f1ec_1f1fa",
    "1f1ec_1f1fc", "1f1ec_1f1fe", "1f1ed_1f1f0", "1f1ed_1f1f2", "1f1ed_1f1f3", "1f1ed_1f1f7", "1f1ed_1f1f9", "1f1ed_1f1fa",
    "1f1ee_1f1e8", "1f1ee_1f1e9", "1f1ee_1f1ea", "1f1ee_1f1f1", "1f1ee_1f1f2", "1f1ee_1f1f3", "1f1ee_1f1f4", "1f1ee_1f1f6",
    "1f1ee_1f1f7", "1f1ee_1f1f8", "1f1ee_1f1f9", "1f1ef_1f1ea", "1f1ef_1f1f2", "1f1ef_1f1f4", "1f1ef_1f1f5", "1f1f0_1f1ea",
    "1f1f0_1f1ec", "1f1f0_1f1ed", "1f1f0_1f1ee", "1f1f0_1f1f2", "1f1f0_1f1f3", "1f1f0_1f1f5", "1f1f0_1f1f7", "1f1f0_1f1fc",
    "1f1f0_1f1fe", "1f1f0_1f1ff", "1f1f1_1f1e6", "1f1f1_1f1e7", "1f1f1_1f1e8", "1f1f1_1f1ee", "1f1f1_1f1f0", "1f1f1_1f1f7",
    "1f1f1_1f1f8", "1f1f1_1f1f9", "1f1f1_1f1fa", "1f1f1_1f1fb", "1f1f1_1f1fe", "1f1f2_1f1e6", "1f1f2_1f1e8", "1f1f2_1f1e9",
    "1f1f2_1f1ea", "1f1f2_1f1eb", "1f1f2_1f1ec", "1f1f2_1f1ed", "1f1f2_1f1f0", "1f1f2_1f1f1", "1f1f2_1f1f2", "1f1f2_1f1f3",
    "1f1f2_1f1f4", "1f1f2_1f1f5", "1f1f2_1f1f6", "1f1f2_1f1f7", "1f1f2_1f1f8", "1f1f2_1f1f9", "1f1f2_1f1fa", "1f1f2_1f1fb",
    "1f1f2_1f1fc", "1f1f2_1f1fd", "1f1f2_1f1fe", "1f1f2_1f1ff", "1f1f3_1f1e6", "1f1f3_1f1e8", "1f1f3_1f1ea", "1f1f3_1f1eb",
    "1f1f3_1f1ec", "1f1f3_1f1ee", "1f1f3_1f1f1", "1f1f3_1f1f4", "1f1f3_1f1f5", "1f1f3_1f1f7", "1f1f3_1f1fa", "1f1f3_1f1ff",
    "1f1f4_1f1f2", "1f1f5_1f1e6", "1f1f5_1f1ea", "1f1f5_1f1eb", "1f1f5_1f1ec", "1f1f5_1f1ed", "1f1f5_1f1f0", "1f1f5_1f1f1",
    "1f1f5_1f1f2", "1f1f5_1f1f3", "1f1f5_1f1f7", "1f1f5_1f1f8", "1f1f5_1f1f9", "1f1f5_1f1fc", "1f1f5_1f1fe", "1f1f6_1f1e6",
    "1f1f7_1f1ea", "1f1f7_1f1f4", "1f1f7_1f1f8", "1f1f7_1f1fa", "1f1f7_1f1fc", "1f1f8_1f1e6", "1f1f8_1f1e7", "1f1f8_1f1e8",
    "1f1f8_1f1e9", "1f1f8_1f1ea", "1f1f8_1f1ec", "1f1f8_1f1ed", "1f1f8_1f1ee", "1f1f8_1f1ef", "1f1f8_1f1f0", "1f1f8_1f1f1",
    "1f1f8_1f1f2", "1f1f8_1f1f3", "1f1f8_1f1f4", "1f1f8_1f1f7", "1f1f8_1f1f8", "1f1f8_1f1f9", "1f1f8_1f1fb", "1f1f8_1f1fd",
    "1f1f8_1f1fe", "1f1f8_1f1ff", "1f1f9_1f1e6", "1f1f9_1f1e8", "1f1f9_1f1e9", "1f1f9_1f1eb", "1f1f9_1f1ec", "1f1f9_1f1ed",
    "1f1f9_1f1ef", "1f1f9_1f1f0", "1f1f9_1f1f1", "1f1f9_1f1f2", "1f1f9_1f1f3", "1f1f9_1f1f4", "1f1f9_1f1f7", "1f1f9_1f1f9",
    "1f1f9_1f1fb", "1f1f9_1f1fc", "1f1f9_1f1ff", "1f1fa_1f1e6", "1f1fa_1f1ec", "1f1fa_1f1f2", "1f1fa_1f1f3", "1f1fa_1f1f8",
    "1f1fa_1f1fe", "1f1fa_1f1ff", "1f1fb_1f1e6", "1f1fb_1f1e8", "1f1fb_1f1ea", "1f1fb_1f1ec", "1f1fb_1f1ee", "1f1fb_1f1f3",
    "1f1fb_1f1fa", "1f1fc_1f1eb", "1f1fc_1f1f8", "1f1fd_1f1f0", "1f1fe_1f1ea", "1f1fe_1f1f9", "1f1ff_1f1e6", "1f1ff_1f1f2",
    "1f1ff_1f1fc", "1f385_1f3fb", "1f385_1f3fc", "1f385_1f3fd", "1f385_1f3fe", "1f385_1f3ff", "1f3c2_1f3fb", "1f3c2_1f3fc",
    "1f3c2_1f3fd", "1f3c2_1f3fe", "1f3c2_1f3ff", "1f3c3_1f3fb", "1f3c3_1f3fb_200d_2640_fe0f", "1f3c3_1f3fb_200d_2642_fe0f",
    "1f3c3_1f3fc", "1f3c3_1f3fc_200d_2640_fe0f", "1f3c3_1f3fc_200d_2642_fe0f", "1f3c3_1f3fd", "1f3c3_1f3fd_200d_2640_fe0f",
    "1f3c3_1f3fd_200d_2642_fe0f", "1f3c3_1f3fe", "1f3c3_1f3fe_200d_2640_fe0f", "1f3c3_1f3fe_200d_2642_fe0f", "1f3c3_1f3ff",
    "1f3c3_1f3ff_200d_2640_fe0f", "1f3c3_1f3ff_200d_2642_fe0f", "1f3c3_200d_2640_fe0f", "1f3c3_200d_2642_fe0f", "1f3c4_1f3fb",
    "1f3c4_1f3fb_200d_2640_fe0f", "1f3c4_1f3fb_200d_2642_fe0f", "1f3c4_1f3fc", "1f3c4_1f3fc_200d_2640_fe0f", "1f3c4_1f3fc_200d_2642_fe0f",
    "1f3c4_1f3fd", "1f3c4_1f3fd_200d_2640_fe0f", "1f3c4_1f3fd_200d_2642_fe0f", "1f3c4_1f3fe", "1f3c4_1f3fe_200d_2640_fe0f",
    "1f3c4_1f3fe_200d_2642_fe0f", "1f3c4_1f3ff", "1f3c4_1f3ff_200d_2640_fe0f", "1f3c4_1f3ff_200d_2642_fe0f", "1f3c4_200d_2640_fe0f",
    "1f3c4_200d_2642_fe0f", "1f3c7_1f3fb", "1f3c7_1f3fc", "1f3c7_1f3fd", "1f3c7_1f3fe", "1f3c7_1f3ff", "1f3ca_1f3fb",
    "1f3ca_1f3fb_200d_2640_fe0f", "1f3ca_1f3fb_200d_2642_fe0f", "1f3ca_1f3fc", "1f3ca_1f3fc_200d_2640_fe0f", "1f3ca_1f3fc_200d_2642_fe0f",
    "1f3ca_1f3fd", "1f3ca_1f3fd_200d_2640_fe0f", "1f3ca_1f3fd_200d_2642_fe0f", "1f3ca_1f3fe", "1f3ca_1f3fe_200d_2640_fe0f",
    "1f3ca_1f3fe_200d_2642_fe0f", "1f3ca_1f3ff", "1f3ca_1f3ff_200d_2640_fe0f", "1f3ca_1f3ff_200d_2642_fe0f", "1f3ca_200d_2640_fe0f",
    "1f3ca_200d_2642_fe0f", "1f3cb_1f3fb", "1f3cb_1f3fb_200d_2640_fe0f", "1f3cb_1f3fb_200d_2642_fe0f", "1f3cb_1f3fc",
    "1f3cb_1f3fc_200d_2640_fe0f", "1f3cb_1f3fc_200d_2642_fe0f", "1f3cb_1f3fd", "1f3cb_1f3fd_200d_2640_fe0f", "1f3cb_1f3fd_200d_2642_fe0f",
    "1f3cb_1f3fe", "1f3cb_1f3fe_200d_2640_fe0f", "1f3cb_1f3fe_200d_2642_fe0f", "1f3cb_1f3ff", "1f3cb_1f3ff_200d_2640_fe0f",
    "1f3cb_1f3ff_200d_2642_fe0f", "1f3cb_fe0f_200d_2640_fe0f", "1f3cb_fe0f_200d_2642_fe0f", "1f3cc_1f3fb", "1f3cc_1f3fb_200d_2640_fe0f",
    "1f3cc_1f3fb_200d_2642_fe0f", "1f3cc_1f3fc", "1f3cc_1f3fc_200d_2640_fe0f", "1f3cc_1f3fc_200d_2642_fe0f", "1f3cc_1f3fd",
    "1f3cc_1f3fd_200d_2640_fe0f", "1f3cc_1f3fd_200d_2642_fe0f", "1f3cc_1f3fe", "1f3cc_1f3fe_200d_2640_fe0f", "1f3cc_1f3fe_200d_2642_fe0f",
    "1f3cc_1f3ff", "1f3cc_1f3ff_200d_2640_fe0f", "1f3cc_1f3ff_200d_2642_fe0f", "1f3cc_fe0f_200d_2640_fe0f", "1f3cc_fe0f_200d_2642_fe0f",
    "1f3f3_fe0f_200d_1f308", "1f441_fe0f_200d_1f5e8_fe0f", "1f442_1f3fb", "1f442_1f3fc", "1f442_1f3fd", "1f442_1f3fe", "1f442_1f3ff",
    "1f443_1f3fb", "1f443_1f3fc", "1f443_1f3fd", "1f443_1f3fe", "1f443_1f3ff", "1f446_1f3fb", "1f446_1f3fc", "1f446_1f3fd",
    "1f446_1f3fe", "1f446_1f3ff", "1f447_1f3fb", "1f447_1f3fc", "1f447_1f3fd", "1f447_1f3fe", "1f447_1f3ff", "1f448_1f3fb",
    "1f448_1f3fc", "1f448_1f3fd", "1f448_1f3fe", "1f448_1f3ff", "1f449_1f3fb", "1f449_1f3fc", "1f449_1f3fd", "1f449_1f3fe",
    "1f449_1f3ff", "1f44a_1f3fb", "1f44a_1f3fc", "1f44a_1f3fd", "1f44a_1f3fe", "1f44a_1f3ff", "1f44b_1f3fb", "1f44b_1f3fc",
    "1f44b_1f3fd", "1f44b_1f3fe", "1f44b_1f3ff", "1f44c_1f3fb", "1f44c_1f3fc", "1f44c_1f3fd", "1f44c_1f3fe", "1f44c_1f3ff",
    "1f44d_1f3fb", "1f44d_1f3fc", "1f44d_1f3fd", "1f44d_1f3fe", "1f44d_1f3ff", "1f44e_1f3fb", "1f44e_1f3fc", "1f44e_1f3fd",
    "1f44e_1f3fe", "1f44e_1f3ff", "1f44f_1f3fb", "1f44f_1f3fc", "1f44f_1f3fd", "1f44f_1f3fe", "1f44f_1f3ff", "1f450_1f3fb",
    "1f450_1f3fc", "1f450_1f3fd", "1f450_1f3fe", "1f450_1f3ff", "1f466_1f3fb", "1f466_1f3fc", "1f466_1f3fd", "1f466_1f3fe",
    "1f466_1f3ff", "1f467_1f3fb", "1f467_1f3fc", "1f467_1f3fd", "1f467_1f3fe", "1f467_1f3ff", "1f468_1f3fb", "1f468_1f3fb_200d_1f33e",
    "1f468_1f3fb_200d_1f373", "1f468_1f3fb_200d_1f393", "1f468_1f3fb_200d_1f3a4", "1f468_1f3fb_200d_1f3a8", "1f468_1f3fb_200d_1f3eb",
    "1f468_1f3fb_200d_1f3ed", "1f468_1f3fb_200d_1f4bb", "1f468_1f3fb_200d_1f4bc", "1f468_1f3fb_200d_1f527", "1f468_1f3fb_200d_1f52c",
    "1f468_1f3fb_200d_1f680", "1f468_1f3fb_200d_1f692", "1f468_1f3fb_200d_2695_fe0f", "1f468_1f3fb_200d_2696_fe0f",
    "1f468_1f3fb_200d_2708_fe0f", "1f468_1f3fc", "1f468_1f3fc_200d_1f33e", "1f468_1f3fc_200d_1f373", "1f468_1f3fc_200d_1f393",
    "1f468_1f3fc_200d_1f3a4", "1f468_1f3fc_200d_1f3a8", "1f468_1f3fc_200d_1f3eb", "1f468_1f3fc_200d_1f3ed", "1f468_1f3fc_200d_1f4bb",
    "1f468_1f3fc_200d_1f4bc", "1f468_1f3fc_200d_1f527", "1f468_1f3fc_200d_1f52c", "1f468_1f3fc_200d_1f680", "1f468_1f3fc_200d_1f692",
    "1f468_1f3fc_200d_2695_fe0f", "1f468_1f3fc_200d_2696_fe0f", "1f468_1f3fc_200d_2708_fe0f", "1f468_1f3fd", "1f468_1f3fd_200d_1f33e",
    "1f468_1f3fd_200d_1f373", "1f468_1f3fd_200d_1f393", "1f468_1f3fd_200d_1f3a4", "1f468_1f3fd_200d_1f3a8", "1f468_1f3fd_200d_1f3eb",
    "1f468_1f3fd_200d_1f3ed", "1f468_1f3fd_200d_1f4bb", "1f468_1f3fd_200d_1f4bc", "1f468_1f3fd_200d_1f527", "1f468_1f3fd_200d_1f52c",
    "1f468_1f3fd_200d_1f680", "1f468_1f3fd_200d_1f692", "1f468_1f3fd_200d_2695_fe0f", "1f468_1f3fd_200d_2696_fe0f",
    "1f468_1f3fd_200d_2708_fe0f", "1f468_1f3fe", "1f468_1f3fe_200d_1f33e", "1f468_1f3fe_200d_1f373", "1f468_1f3fe_200d_1f393",
    "1f468_1f3fe_200d_1f3a4", "1f468_1f3fe_200d_1f3a8", "1f468_1f3fe_200d_1f3eb", "1f468_1f3fe_200d_1f3ed", "1f468_1f3fe_200d_1f4bb",
    "1f468_1f3fe_200d_1f4bc", "1f468_1f3fe_200d_1f527", "1f468_1f3fe_200d_1f52c", "1f468_1f3fe_200d_1f680", "1f468_1f3fe_200d_1f692",
    "1f468_1f3fe_200d_2695_fe0f", "1f468_1f3fe_200d_2696_fe0f", "1f468_1f3fe_200d_2708_fe0f", "1f468_1f3ff", "1f468_1f3ff_200d_1f33e",
    "1f468_1f3ff_200d_1f373", "1f468_1f3ff_200d_1f393", "1f468_1f3ff_200d_1f3a4", "1f468_1f3ff_200d_1f3a8", "1f468_1f3ff_200d_1f3eb",
    "1f468_1f3ff_200d_1f3ed", "1f468_1f3ff_200d_1f4bb", "1f468_1f3ff_200d_1f4bc", "1f468_1f3ff_200d_1f527", "1f468_1f3ff_200d_1f52c",
    "1f468_1f3ff_200d_1f680", "1f468_1f3ff_200d_1f692", "1f468_1f3ff_200d_2695_fe0f", "1f468_1f3ff_200d_2696_fe0f", "1f468_1f3ff_200d_2708_fe0f",
    "1f468_200d_1f33e", "1f468_200d_1f373", "1f468_200d_1f393", "1f468_200d_1f3a4", "1f468_200d_1f3a8", "1f468_200d_1f3eb",
    "1f468_200d_1f3ed", "1f468_200d_1f466", "1f468_200d_1f466_200d_1f466", "1f468_200d_1f467", "1f468_200d_1f467_200d_1f466",
    "1f468_200d_1f467_200d_1f467", "1f468_200d_1f468_200d_1f466", "1f468_200d_1f468_200d_1f466_200d_1f466", "1f468_200d_1f468_200d_1f467",
    "1f468_200d_1f468_200d_1f467_200d_1f466", "1f468_200d_1f468_200d_1f467_200d_1f467", "1f468_200d_1f468_200d_1f467_200d_1f467",
    "1f468_200d_1f469_200d_1f466", "1f468_200d_1f469_200d_1f466_200d_1f466", "1f468_200d_1f469_200d_1f467", "1f468_200d_1f469_200d_1f467_200d_1f466",
    "1f468_200d_1f469_200d_1f467_200d_1f467", "1f468_200d_1f4bb", "1f468_200d_1f4bc", "1f468_200d_1f527", "1f468_200d_1f52c",
    "1f468_200d_1f680", "1f468_200d_1f692", "1f468_200d_2695_fe0f", "1f468_200d_2696_fe0f", "1f468_200d_2708_fe0f", "1f468_200d_2764_fe0f_200d_1f468",
    "1f468_200d_2764_fe0f_200d_1f48b_200d_1f468", "1f469_1f3fb", "1f469_1f3fb_200d_1f33e", "1f469_1f3fb_200d_1f373", "1f469_1f3fb_200d_1f393",
    "1f469_1f3fb_200d_1f3a4", "1f469_1f3fb_200d_1f3a8", "1f469_1f3fb_200d_1f3eb", "1f469_1f3fb_200d_1f3ed", "1f469_1f3fb_200d_1f4bb",
    "1f469_1f3fb_200d_1f4bc", "1f469_1f3fb_200d_1f527", "1f469_1f3fb_200d_1f52c", "1f469_1f3fb_200d_1f680", "1f469_1f3fb_200d_1f692",
    "1f469_1f3fb_200d_2695_fe0f", "1f469_1f3fb_200d_2696_fe0f", "1f469_1f3fb_200d_2708_fe0f", "1f469_1f3fc", "1f469_1f3fc_200d_1f33e",
    "1f469_1f3fc_200d_1f373", "1f469_1f3fc_200d_1f393", "1f469_1f3fc_200d_1f3a4", "1f469_1f3fc_200d_1f3a8", "1f469_1f3fc_200d_1f3eb",
    "1f469_1f3fc_200d_1f3ed", "1f469_1f3fc_200d_1f4bb", "1f469_1f3fc_200d_1f4bc", "1f469_1f3fc_200d_1f527", "1f469_1f3fc_200d_1f52c",
    "1f469_1f3fc_200d_1f680", "1f469_1f3fc_200d_1f692", "1f469_1f3fc_200d_2695_fe0f", "1f469_1f3fc_200d_2696_fe0f", "1f469_1f3fc_200d_2708_fe0f",
    "1f469_1f3fd", "1f469_1f3fd_200d_1f33e", "1f469_1f3fd_200d_1f373", "1f469_1f3fd_200d_1f393", "1f469_1f3fd_200d_1f3a4",
    "1f469_1f3fd_200d_1f3a8", "1f469_1f3fd_200d_1f3eb", "1f469_1f3fd_200d_1f3ed", "1f469_1f3fd_200d_1f4bb", "1f469_1f3fd_200d_1f4bc",
    "1f469_1f3fd_200d_1f527", "1f469_1f3fd_200d_1f52c", "1f469_1f3fd_200d_1f680", "1f469_1f3fd_200d_1f692", "1f469_1f3fd_200d_2695_fe0f",
    "1f469_1f3fd_200d_2696_fe0f", "1f469_1f3fd_200d_2708_fe0f", "1f469_1f3fe", "1f469_1f3fe_200d_1f33e", "1f469_1f3fe_200d_1f373",
    "1f469_1f3fe_200d_1f393", "1f469_1f3fe_200d_1f3a4", "1f469_1f3fe_200d_1f3a8", "1f469_1f3fe_200d_1f3eb", "1f469_1f3fe_200d_1f3ed",
    "1f469_1f3fe_200d_1f4bb", "1f469_1f3fe_200d_1f4bc", "1f469_1f3fe_200d_1f527", "1f469_1f3fe_200d_1f52c", "1f469_1f3fe_200d_1f680",
    "1f469_1f3fe_200d_1f692", "1f469_1f3fe_200d_2695_fe0f", "1f469_1f3fe_200d_2696_fe0f", "1f469_1f3fe_200d_2708_fe0f",
    "1f469_1f3ff", "1f469_1f3ff_200d_1f33e", "1f469_1f3ff_200d_1f373", "1f469_1f3ff_200d_1f393", "1f469_1f3ff_200d_1f3a4",
    "1f469_1f3ff_200d_1f3a8", "1f469_1f3ff_200d_1f3eb", "1f469_1f3ff_200d_1f3ed", "1f469_1f3ff_200d_1f4bb", "1f469_1f3ff_200d_1f4bc",
    "1f469_1f3ff_200d_1f527", "1f469_1f3ff_200d_1f52c", "1f469_1f3ff_200d_1f680", "1f469_1f3ff_200d_1f692", "1f469_1f3ff_200d_2695_fe0f",
    "1f469_1f3ff_200d_2696_fe0f", "1f469_1f3ff_200d_2708_fe0f", "1f469_200d_1f33e", "1f469_200d_1f373", "1f469_200d_1f393",
    "1f469_200d_1f3a4", "1f469_200d_1f3a8", "1f469_200d_1f3eb", "1f469_200d_1f3ed", "1f469_200d_1f466", "1f469_200d_1f466_200d_1f466",
    "1f469_200d_1f467", "1f469_200d_1f467_200d_1f466", "1f469_200d_1f467_200d_1f467", "1f469_200d_1f469_200d_1f466",
    "1f469_200d_1f469_200d_1f466_200d_1f466", "1f469_200d_1f469_200d_1f467", "1f469_200d_1f469_200d_1f467_200d_1f466",
    "1f469_200d_1f469_200d_1f467_200d_1f467", "1f469_200d_1f4bb", "1f469_200d_1f4bc", "1f469_200d_1f527", "1f469_200d_1f52c",
    "1f469_200d_1f680", "1f469_200d_1f692", "1f469_200d_2695_fe0f", "1f469_200d_2696_fe0f", "1f469_200d_2708_fe0f",
    "1f469_200d_2764_fe0f_200d_1f468", "1f469_200d_2764_fe0f_200d_1f469", "1f469_200d_2764_fe0f_200d_1f48b_200d_1f468",
    "1f469_200d_2764_fe0f_200d_1f48b_200d_1f469", "1f46e_1f3fb", "1f46e_1f3fb_200d_2640_fe0f", "1f46e_1f3fb_200d_2642_fe0f",
    "1f46e_1f3fc", "1f46e_1f3fc_200d_2640_fe0f", "1f46e_1f3fc_200d_2642_fe0f", "1f46e_1f3fd", "1f46e_1f3fd_200d_2640_fe0f",
    "1f46e_1f3fd_200d_2642_fe0f", "1f46e_1f3fe", "1f46e_1f3fe_200d_2640_fe0f", "1f46e_1f3fe_200d_2642_fe0f", "1f46e_1f3ff",
    "1f46e_1f3ff_200d_2640_fe0f", "1f46e_1f3ff_200d_2642_fe0f", "1f46e_200d_2640_fe0f", "1f46e_200d_2642_fe0f", "1f46f_200d_2640_fe0f",
    "1f46f_200d_2642_fe0f", "1f470_1f3fb", "1f470_1f3fc", "1f470_1f3fd", "1f470_1f3fe", "1f470_1f3ff", "1f471_1f3fb",
    "1f471_1f3fb_200d_2640_fe0f", "1f471_1f3fb_200d_2642_fe0f", "1f471_1f3fc", "1f471_1f3fc_200d_2640_fe0f", "1f471_1f3fc_200d_2642_fe0f",
    "1f471_1f3fd", "1f471_1f3fd_200d_2640_fe0f", "1f471_1f3fd_200d_2642_fe0f", "1f471_1f3fe", "1f471_1f3fe_200d_2640_fe0f",
    "1f471_1f3fe_200d_2642_fe0f", "1f471_1f3ff", "1f471_1f3ff_200d_2640_fe0f", "1f471_1f3ff_200d_2642_fe0f", "1f471_200d_2640_fe0f",
    "1f471_200d_2642_fe0f", "1f472_1f3fb", "1f472_1f3fc", "1f472_1f3fd", "1f472_1f3fe", "1f472_1f3ff", "1f473_1f3fb",
    "1f473_1f3fb_200d_2640_fe0f", "1f473_1f3fb_200d_2642_fe0f", "1f473_1f3fc", "1f473_1f3fc_200d_2640_fe0f", "1f473_1f3fc_200d_2642_fe0f",
    "1f473_1f3fd", "1f473_1f3fd_200d_2640_fe0f", "1f473_1f3fd_200d_2642_fe0f", "1f473_1f3fe", "1f473_1f3fe_200d_2640_fe0f",
    "1f473_1f3fe_200d_2642_fe0f", "1f473_1f3ff", "1f473_1f3ff_200d_2640_fe0f", "1f473_1f3ff_200d_2642_fe0f", "1f473_200d_2640_fe0f",
    "1f473_200d_2642_fe0f", "1f474_1f3fb", "1f474_1f3fc", "1f474_1f3fd", "1f474_1f3fe", "1f474_1f3ff", "1f475_1f3fb", "1f475_1f3fc",
    "1f475_1f3fd", "1f475_1f3fe", "1f475_1f3ff", "1f476_1f3fb", "1f476_1f3fc", "1f476_1f3fd", "1f476_1f3fe", "1f476_1f3ff",
    "1f477_1f3fb", "1f477_1f3fb_200d_2640_fe0f", "1f477_1f3fb_200d_2642_fe0f", "1f477_1f3fc", "1f477_1f3fc_200d_2640_fe0f",
    "1f477_1f3fc_200d_2642_fe0f", "1f477_1f3fd", "1f477_1f3fd_200d_2640_fe0f", "1f477_1f3fd_200d_2642_fe0f", "1f477_1f3fe",
    "1f477_1f3fe_200d_2640_fe0f", "1f477_1f3fe_200d_2642_fe0f", "1f477_1f3ff", "1f477_1f3ff_200d_2640_fe0f", "1f477_1f3ff_200d_2642_fe0f",
    "1f477_200d_2640_fe0f", "1f477_200d_2642_fe0f", "1f478_1f3fb", "1f478_1f3fc", "1f478_1f3fd", "1f478_1f3fe", "1f478_1f3ff",
    "1f47c_1f3fb", "1f47c_1f3fc", "1f47c_1f3fd", "1f47c_1f3fe", "1f47c_1f3ff", "1f481_1f3fb", "1f481_1f3fb_200d_2640_fe0f",
    "1f481_1f3fb_200d_2642_fe0f", "1f481_1f3fc", "1f481_1f3fc_200d_2640_fe0f", "1f481_1f3fc_200d_2642_fe0f", "1f481_1f3fd",
    "1f481_1f3fd_200d_2640_fe0f", "1f481_1f3fd_200d_2642_fe0f", "1f481_1f3fe", "1f481_1f3fe_200d_2640_fe0f", "1f481_1f3fe_200d_2642_fe0f",
    "1f481_1f3ff", "1f481_1f3ff_200d_2640_fe0f", "1f481_1f3ff_200d_2642_fe0f", "1f481_200d_2640_fe0f", "1f481_200d_2642_fe0f",
    "1f482_1f3fb", "1f482_1f3fb_200d_2640_fe0f", "1f482_1f3fb_200d_2642_fe0f", "1f482_1f3fc", "1f482_1f3fc_200d_2640_fe0f",
    "1f482_1f3fc_200d_2642_fe0f", "1f482_1f3fd", "1f482_1f3fd_200d_2640_fe0f", "1f482_1f3fd_200d_2642_fe0f", "1f482_1f3fe",
    "1f482_1f3fe_200d_2640_fe0f", "1f482_1f3fe_200d_2642_fe0f", "1f482_1f3ff", "1f482_1f3ff_200d_2640_fe0f", "1f482_1f3ff_200d_2642_fe0f",
    "1f482_200d_2640_fe0f", "1f482_200d_2642_fe0f", "1f483_1f3fb", "1f483_1f3fc", "1f483_1f3fd", "1f483_1f3fe", "1f483_1f3ff",
    "1f485_1f3fb", "1f485_1f3fc", "1f485_1f3fd", "1f485_1f3fe", "1f485_1f3ff", "1f486_1f3fb", "1f486_1f3fb_200d_2640_fe0f",
    "1f486_1f3fb_200d_2642_fe0f", "1f486_1f3fc", "1f486_1f3fc_200d_2640_fe0f", "1f486_1f3fc_200d_2642_fe0f", "1f486_1f3fd",
    "1f486_1f3fd_200d_2640_fe0f", "1f486_1f3fd_200d_2642_fe0f", "1f486_1f3fe", "1f486_1f3fe_200d_2640_fe0f", "1f486_1f3fe_200d_2642_fe0f",
    "1f486_1f3ff", "1f486_1f3ff_200d_2640_fe0f", "1f486_1f3ff_200d_2642_fe0f", "1f486_200d_2640_fe0f", "1f486_200d_2642_fe0f",
    "1f487_1f3fb", "1f487_1f3fb_200d_2640_fe0f", "1f487_1f3fb_200d_2642_fe0f", "1f487_1f3fc", "1f487_1f3fc_200d_2640_fe0f",
    "1f487_1f3fc_200d_2642_fe0f", "1f487_1f3fd", "1f487_1f3fd_200d_2640_fe0f", "1f487_1f3fd_200d_2642_fe0f", "1f487_1f3fe",
    "1f487_1f3fe_200d_2640_fe0f", "1f487_1f3fe_200d_2642_fe0f", "1f487_1f3ff", "1f487_1f3ff_200d_2640_fe0f", "1f487_1f3ff_200d_2642_fe0f",
    "1f487_200d_2640_fe0f", "1f487_200d_2642_fe0f", "1f4aa_1f3fb", "1f4aa_1f3fc", "1f4aa_1f3fd", "1f4aa_1f3fe", "1f4aa_1f3ff",
    "1f574_1f3fb", "1f574_1f3fc", "1f574_1f3fd", "1f574_1f3fe", "1f574_1f3ff", "1f575_1f3fb", "1f575_1f3fb_200d_2640_fe0f",
    "1f575_1f3fb_200d_2642_fe0f", "1f575_1f3fc", "1f575_1f3fc_200d_2640_fe0f", "1f575_1f3fc_200d_2642_fe0f", "1f575_1f3fd",
    "1f575_1f3fd_200d_2640_fe0f", "1f575_1f3fd_200d_2642_fe0f", "1f575_1f3fe", "1f575_1f3fe_200d_2640_fe0f", "1f575_1f3fe_200d_2642_fe0f",
    "1f575_1f3ff", "1f575_1f3ff_200d_2640_fe0f", "1f575_1f3ff_200d_2642_fe0f", "1f575_fe0f_200d_2640_fe0f", "1f575_fe0f_200d_2642_fe0f",
    "1f57a_1f3fb", "1f57a_1f3fc", "1f57a_1f3fd", "1f57a_1f3fe", "1f57a_1f3ff", "1f590_1f3fb", "1f590_1f3fc", "1f590_1f3fd",
    "1f590_1f3fe", "1f590_1f3ff", "1f595_1f3fb", "1f595_1f3fc", "1f595_1f3fd", "1f595_1f3fe", "1f595_1f3ff", "1f596_1f3fb",
    "1f596_1f3fc", "1f596_1f3fd", "1f596_1f3fe", "1f596_1f3ff", "1f645_1f3fb", "1f645_1f3fb_200d_2640_fe0f", "1f645_1f3fb_200d_2642_fe0f",
    "1f645_1f3fc", "1f645_1f3fc_200d_2640_fe0f", "1f645_1f3fc_200d_2642_fe0f", "1f645_1f3fd", "1f645_1f3fd_200d_2640_fe0f",
    "1f645_1f3fd_200d_2642_fe0f", "1f645_1f3fe", "1f645_1f3fe_200d_2640_fe0f", "1f645_1f3fe_200d_2642_fe0f", "1f645_1f3ff",
    "1f645_1f3ff_200d_2640_fe0f", "1f645_1f3ff_200d_2642_fe0f", "1f645_200d_2640_fe0f", "1f645_200d_2642_fe0f", "1f646_1f3fb",
    "1f646_1f3fb_200d_2640_fe0f", "1f646_1f3fb_200d_2642_fe0f", "1f646_1f3fc", "1f646_1f3fc_200d_2640_fe0f", "1f646_1f3fc_200d_2642_fe0f",
    "1f646_1f3fd", "1f646_1f3fd_200d_2640_fe0f", "1f646_1f3fd_200d_2642_fe0f", "1f646_1f3fe", "1f646_1f3fe_200d_2640_fe0f",
    "1f646_1f3fe_200d_2642_fe0f", "1f646_1f3ff", "1f646_1f3ff_200d_2640_fe0f", "1f646_1f3ff_200d_2642_fe0f", "1f646_200d_2640_fe0f",
    "1f646_200d_2642_fe0f", "1f647_1f3fb", "1f647_1f3fb_200d_2640_fe0f", "1f647_1f3fb_200d_2642_fe0f", "1f647_1f3fc",
    "1f647_1f3fc_200d_2640_fe0f", "1f647_1f3fc_200d_2642_fe0f", "1f647_1f3fd", "1f647_1f3fd_200d_2640_fe0f", "1f647_1f3fd_200d_2642_fe0f",
    "1f647_1f3fe", "1f647_1f3fe_200d_2640_fe0f", "1f647_1f3fe_200d_2642_fe0f", "1f647_1f3ff", "1f647_1f3ff_200d_2640_fe0f",
    "1f647_1f3ff_200d_2642_fe0f", "1f647_200d_2640_fe0f", "1f647_200d_2642_fe0f", "1f64b_1f3fb", "1f64b_1f3fb_200d_2640_fe0f",
    "1f64b_1f3fb_200d_2642_fe0f", "1f64b_1f3fc", "1f64b_1f3fc_200d_2640_fe0f", "1f64b_1f3fc_200d_2642_fe0f", "1f64b_1f3fd",
    "1f64b_1f3fd_200d_2640_fe0f", "1f64b_1f3fd_200d_2642_fe0f", "1f64b_1f3fe", "1f64b_1f3fe_200d_2640_fe0f", "1f64b_1f3fe_200d_2642_fe0f",
    "1f64b_1f3ff", "1f64b_1f3ff_200d_2640_fe0f", "1f64b_1f3ff_200d_2642_fe0f", "1f64b_200d_2640_fe0f", "1f64b_200d_2642_fe0f",
    "1f64c_1f3fb", "1f64c_1f3fc", "1f64c_1f3fd", "1f64c_1f3fe", "1f64c_1f3ff", "1f64d_1f3fb", "1f64d_1f3fb_200d_2640_fe0f",
    "1f64d_1f3fb_200d_2642_fe0f", "1f64d_1f3fc", "1f64d_1f3fc_200d_2640_fe0f", "1f64d_1f3fc_200d_2642_fe0f", "1f64d_1f3fd",
    "1f64d_1f3fd_200d_2640_fe0f", "1f64d_1f3fd_200d_2642_fe0f", "1f64d_1f3fe", "1f64d_1f3fe_200d_2640_fe0f", "1f64d_1f3fe_200d_2642_fe0f",
    "1f64d_1f3ff", "1f64d_1f3ff_200d_2640_fe0f", "1f64d_1f3ff_200d_2642_fe0f", "1f64d_200d_2640_fe0f", "1f64d_200d_2642_fe0f",
    "1f64e_1f3fb", "1f64e_1f3fb_200d_2640_fe0f", "1f64e_1f3fb_200d_2642_fe0f", "1f64e_1f3fc", "1f64e_1f3fc_200d_2640_fe0f",
    "1f64e_1f3fc_200d_2642_fe0f", "1f64e_1f3fd", "1f64e_1f3fd_200d_2640_fe0f", "1f64e_1f3fd_200d_2642_fe0f", "1f64e_1f3fe",
    "1f64e_1f3fe_200d_2640_fe0f", "1f64e_1f3fe_200d_2642_fe0f", "1f64e_1f3ff", "1f64e_1f3ff_200d_2640_fe0f", "1f64e_1f3ff_200d_2642_fe0f",
    "1f64e_200d_2640_fe0f", "1f64e_200d_2642_fe0f", "1f64f_1f3fb", "1f64f_1f3fc", "1f64f_1f3fd", "1f64f_1f3fe", "1f64f_1f3ff",
    "1f6a3_1f3fb", "1f6a3_1f3fb_200d_2640_fe0f", "1f6a3_1f3fb_200d_2642_fe0f", "1f6a3_1f3fc", "1f6a3_1f3fc_200d_2640_fe0f",
    "1f6a3_1f3fc_200d_2642_fe0f", "1f6a3_1f3fd", "1f6a3_1f3fd_200d_2640_fe0f", "1f6a3_1f3fd_200d_2642_fe0f", "1f6a3_1f3fe",
    "1f6a3_1f3fe_200d_2640_fe0f", "1f6a3_1f3fe_200d_2642_fe0f", "1f6a3_1f3ff", "1f6a3_1f3ff_200d_2640_fe0f", "1f6a3_1f3ff_200d_2642_fe0f",
    "1f6a3_200d_2640_fe0f", "1f6a3_200d_2642_fe0f", "1f6b4_1f3fb", "1f6b4_1f3fb_200d_2640_fe0f", "1f6b4_1f3fb_200d_2642_fe0f",
    "1f6b4_1f3fc", "1f6b4_1f3fc_200d_2640_fe0f", "1f6b4_1f3fc_200d_2642_fe0f", "1f6b4_1f3fd", "1f6b4_1f3fd_200d_2640_fe0f",
    "1f6b4_1f3fd_200d_2642_fe0f", "1f6b4_1f3fe", "1f6b4_1f3fe_200d_2640_fe0f", "1f6b4_1f3fe_200d_2642_fe0f", "1f6b4_1f3ff",
    "1f6b4_1f3ff_200d_2640_fe0f", "1f6b4_1f3ff_200d_2642_fe0f", "1f6b4_200d_2640_fe0f", "1f6b4_200d_2642_fe0f", "1f6b5_1f3fb",
    "1f6b5_1f3fb_200d_2640_fe0f", "1f6b5_1f3fb_200d_2642_fe0f", "1f6b5_1f3fc", "1f6b5_1f3fc_200d_2640_fe0f", "1f6b5_1f3fc_200d_2642_fe0f",
    "1f6b5_1f3fd", "1f6b5_1f3fd_200d_2640_fe0f", "1f6b5_1f3fd_200d_2642_fe0f", "1f6b5_1f3fe", "1f6b5_1f3fe_200d_2640_fe0f",
    "1f6b5_1f3fe_200d_2642_fe0f", "1f6b5_1f3ff", "1f6b5_1f3ff_200d_2640_fe0f", "1f6b5_1f3ff_200d_2642_fe0f", "1f6b5_200d_2640_fe0f",
    "1f6b5_200d_2642_fe0f", "1f6b6_1f3fb", "1f6b6_1f3fb_200d_2640_fe0f", "1f6b6_1f3fb_200d_2642_fe0f", "1f6b6_1f3fc",
    "1f6b6_1f3fc_200d_2640_fe0f", "1f6b6_1f3fc_200d_2642_fe0f", "1f6b6_1f3fd", "1f6b6_1f3fd_200d_2640_fe0f", "1f6b6_1f3fd_200d_2642_fe0f",
    "1f6b6_1f3fe", "1f6b6_1f3fe_200d_2640_fe0f", "1f6b6_1f3fe_200d_2642_fe0f", "1f6b6_1f3ff", "1f6b6_1f3ff_200d_2640_fe0f",
    "1f6b6_1f3ff_200d_2642_fe0f", "1f6b6_200d_2640_fe0f", "1f6b6_200d_2642_fe0f", "1f6c0_1f3fb", "1f6c0_1f3fc", "1f6c0_1f3fd",
    "1f6c0_1f3fe", "1f6c0_1f3ff", "1f6cc_1f3fb", "1f6cc_1f3fc", "1f6cc_1f3fd", "1f6cc_1f3fe", "1f6cc_1f3ff", "1f918_1f3fb",
    "1f918_1f3fc", "1f918_1f3fd", "1f918_1f3fe", "1f918_1f3ff", "1f919_1f3fb", "1f919_1f3fc", "1f919_1f3fd", "1f919_1f3fe",
    "1f919_1f3ff", "1f91a_1f3fb", "1f91a_1f3fc", "1f91a_1f3fd", "1f91a_1f3fe", "1f91a_1f3ff", "1f91b_1f3fb", "1f91b_1f3fc",
    "1f91b_1f3fd", "1f91b_1f3fe", "1f91b_1f3ff", "1f91c_1f3fb", "1f91c_1f3fc", "1f91c_1f3fd", "1f91c_1f3fe", "1f91c_1f3ff",
    "1f91e_1f3fb", "1f91e_1f3fc", "1f91e_1f3fd", "1f91e_1f3fe", "1f91e_1f3ff", "1f926_1f3fb", "1f926_1f3fb_200d_2640_fe0f",
    "1f926_1f3fb_200d_2642_fe0f", "1f926_1f3fc", "1f926_1f3fc_200d_2640_fe0f", "1f926_1f3fc_200d_2642_fe0f", "1f926_1f3fd",
    "1f926_1f3fd_200d_2640_fe0f", "1f926_1f3fd_200d_2642_fe0f", "1f926_1f3fe", "1f926_1f3fe_200d_2640_fe0f", "1f926_1f3fe_200d_2642_fe0f",
    "1f926_1f3ff", "1f926_1f3ff_200d_2640_fe0f", "1f926_1f3ff_200d_2642_fe0f", "1f926_200d_2640_fe0f", "1f926_200d_2642_fe0f",
    "1f930_1f3fb", "1f930_1f3fc", "1f930_1f3fd", "1f930_1f3fe", "1f930_1f3ff", "1f933_1f3fb", "1f933_1f3fc", "1f933_1f3fd",
    "1f933_1f3fe", "1f933_1f3ff", "1f934_1f3fb", "1f934_1f3fc", "1f934_1f3fd", "1f934_1f3fe", "1f934_1f3ff", "1f935_1f3fb",
    "1f935_1f3fc", "1f935_1f3fd", "1f935_1f3fe", "1f935_1f3ff", "1f936_1f3fb", "1f936_1f3fc", "1f936_1f3fd", "1f936_1f3fe",
    "1f936_1f3ff", "1f937_1f3fb", "1f937_1f3fb_200d_2640_fe0f", "1f937_1f3fb_200d_2642_fe0f", "1f937_1f3fc", "1f937_1f3fc_200d_2640_fe0f",
    "1f937_1f3fc_200d_2642_fe0f", "1f937_1f3fd", "1f937_1f3fd_200d_2640_fe0f", "1f937_1f3fd_200d_2642_fe0f", "1f937_1f3fe",
    "1f937_1f3fe_200d_2640_fe0f", "1f937_1f3fe_200d_2642_fe0f", "1f937_1f3ff", "1f937_1f3ff_200d_2640_fe0f", "1f937_1f3ff_200d_2642_fe0f",
    "1f937_200d_2640_fe0f", "1f937_200d_2642_fe0f", "1f938_1f3fb", "1f938_1f3fb_200d_2640_fe0f", "1f938_1f3fb_200d_2642_fe0f",
    "1f938_1f3fc", "1f938_1f3fc_200d_2640_fe0f", "1f938_1f3fc_200d_2642_fe0f", "1f938_1f3fd", "1f938_1f3fd_200d_2640_fe0f",
    "1f938_1f3fd_200d_2642_fe0f", "1f938_1f3fe", "1f938_1f3fe_200d_2640_fe0f", "1f938_1f3fe_200d_2642_fe0f", "1f938_1f3ff",
    "1f938_1f3ff_200d_2640_fe0f", "1f938_1f3ff_200d_2642_fe0f", "1f938_200d_2640_fe0f", "1f938_200d_2642_fe0f", "1f939_1f3fb",
    "1f939_1f3fb_200d_2640_fe0f", "1f939_1f3fb_200d_2642_fe0f", "1f939_1f3fc", "1f939_1f3fc_200d_2640_fe0f", "1f939_1f3fc_200d_2642_fe0f",
    "1f939_1f3fd", "1f939_1f3fd_200d_2640_fe0f", "1f939_1f3fd_200d_2642_fe0f", "1f939_1f3fe", "1f939_1f3fe_200d_2640_fe0f",
    "1f939_1f3fe_200d_2642_fe0f", "1f939_1f3ff", "1f939_1f3ff_200d_2640_fe0f", "1f939_1f3ff_200d_2642_fe0f", "1f939_200d_2640_fe0f",
    "1f939_200d_2642_fe0f", "1f93c_200d_2640_fe0f", "1f93c_200d_2642_fe0f", "1f93d_1f3fb", "1f93d_1f3fb_200d_2640_fe0f",
    "1f93d_1f3fb_200d_2642_fe0f", "1f93d_1f3fc", "1f93d_1f3fc_200d_2640_fe0f", "1f93d_1f3fc_200d_2642_fe0f", "1f93d_1f3fd",
    "1f93d_1f3fd_200d_2640_fe0f", "1f93d_1f3fd_200d_2642_fe0f", "1f93d_1f3fe", "1f93d_1f3fe_200d_2640_fe0f", "1f93d_1f3fe_200d_2642_fe0f",
    "1f93d_1f3ff", "1f93d_1f3ff_200d_2640_fe0f", "1f93d_1f3ff_200d_2642_fe0f", "1f93d_200d_2640_fe0f", "1f93d_200d_2642_fe0f",
    "1f93e_1f3fb", "1f93e_1f3fb_200d_2640_fe0f", "1f93e_1f3fb_200d_2642_fe0f", "1f93e_1f3fc", "1f93e_1f3fc_200d_2640_fe0f",
    "1f93e_1f3fc_200d_2642_fe0f", "1f93e_1f3fd", "1f93e_1f3fd_200d_2640_fe0f", "1f93e_1f3fd_200d_2642_fe0f", "1f93e_1f3fe",
    "1f93e_1f3fe_200d_2640_fe0f", "1f93e_1f3fe_200d_2642_fe0f", "1f93e_1f3ff", "1f93e_1f3ff_200d_2640_fe0f", "1f93e_1f3ff_200d_2642_fe0f",
    "1f93e_200d_2640_fe0f", "1f93e_200d_2642_fe0f", "261d_1f3fb", "261d_1f3fc", "261d_1f3fd", "261d_1f3fe", "261d_1f3ff",
    "26f9_1f3fb", "26f9_1f3fb_200d_2640_fe0f", "26f9_1f3fb_200d_2642_fe0f", "26f9_1f3fc", "26f9_1f3fc_200d_2640_fe0f",
    "26f9_1f3fc_200d_2642_fe0f", "26f9_1f3fd", "26f9_1f3fd_200d_2640_fe0f", "26f9_1f3fd_200d_2642_fe0f", "26f9_1f3fe",
    "26f9_1f3fe_200d_2640_fe0f", "26f9_1f3fe_200d_2642_fe0f", "26f9_1f3ff", "26f9_1f3ff_200d_2640_fe0f", "26f9_1f3ff_200d_2642_fe0f",
    "26f9_fe0f_200d_2640_fe0f", "26f9_fe0f_200d_2642_fe0f", "270a_1f3fb", "270a_1f3fc", "270a_1f3fd", "270a_1f3fe", "270a_1f3ff",
    "270b_1f3fb", "270b_1f3fc", "270b_1f3fd", "270b_1f3fe", "270b_1f3ff", "270c_1f3fb", "270c_1f3fc", "270c_1f3fd", "270c_1f3fe",
    "270c_1f3ff", "270d_1f3fb", "270d_1f3fc", "270d_1f3fd", "270d_1f3fe", "270d_1f3ff"];

// emoji names. Full Emoji Data, v4.0 from http://unicode.org/emoji/charts/full-emoji-list.html
var emoji_names = [{"code": "1f600", "name": "grinning face"}, {
    "code": "1f601",
    "name": "grinning face with smiling eyes"
}, {"code": "1f602", "name": "face with tears of joy"}, {
    "code": "1f923",
    "name": "rolling on the floor laughing"
}, {"code": "1f603", "name": "smiling face with open mouth"}, {
    "code": "1f604",
    "name": "smiling face with open mouth & smiling eyes"
}, {"code": "1f605", "name": "smiling face with open mouth & cold sweat"}, {
    "code": "1f606",
    "name": "smiling face with open mouth & closed eyes"
}, {"code": "1f609", "name": "winking face"}, {
    "code": "1f60a",
    "name": "smiling face with smiling eyes"
}, {"code": "1f60b", "name": "face savouring delicious food"}, {
    "code": "1f60e",
    "name": "smiling face with sunglasses"
}, {"code": "1f60d", "name": "smiling face with heart-eyes"}, {
    "code": "1f618",
    "name": "face blowing a kiss"
}, {"code": "1f617", "name": "kissing face"}, {
    "code": "1f619",
    "name": "kissing face with smiling eyes"
}, {"code": "1f61a", "name": "kissing face with closed eyes"}, {
    "code": "263a",
    "name": "smiling face"
}, {"code": "1f642", "name": "slightly smiling face"}, {"code": "1f917", "name": "hugging face"}, {
    "code": "1f914",
    "name": "thinking face"
}, {"code": "1f610", "name": "neutral face"}, {"code": "1f611", "name": "expressionless face"}, {
    "code": "1f636",
    "name": "face without mouth"
}, {"code": "1f644", "name": "face with rolling eyes"}, {"code": "1f60f", "name": "smirking face"}, {
    "code": "1f623",
    "name": "persevering face"
}, {"code": "1f625", "name": "disappointed but relieved face"}, {
    "code": "1f62e",
    "name": "face with open mouth"
}, {"code": "1f910", "name": "zipper-mouth face"}, {"code": "1f62f", "name": "hushed face"}, {
    "code": "1f62a",
    "name": "sleepy face"
}, {"code": "1f62b", "name": "tired face"}, {"code": "1f634", "name": "sleeping face"}, {
    "code": "1f60c",
    "name": "relieved face"
}, {"code": "1f913", "name": "nerd face"}, {"code": "1f61b", "name": "face with stuck-out tongue"}, {
    "code": "1f61c",
    "name": "face with stuck-out tongue & winking eye"
}, {"code": "1f61d", "name": "face with stuck-out tongue & closed eyes"}, {
    "code": "1f924",
    "name": "drooling face"
}, {"code": "1f612", "name": "unamused face"}, {"code": "1f613", "name": "face with cold sweat"}, {
    "code": "1f614",
    "name": "pensive face"
}, {"code": "1f615", "name": "confused face"}, {"code": "1f643", "name": "upside-down face"}, {
    "code": "1f911",
    "name": "money-mouth face"
}, {"code": "1f632", "name": "astonished face"}, {"code": "2639", "name": "frowning face"}, {
    "code": "1f641",
    "name": "slightly frowning face"
}, {"code": "1f616", "name": "confounded face"}, {"code": "1f61e", "name": "disappointed face"}, {
    "code": "1f61f",
    "name": "worried face"
}, {"code": "1f624", "name": "face with steam from nose"}, {"code": "1f622", "name": "crying face"}, {
    "code": "1f62d",
    "name": "loudly crying face"
}, {"code": "1f626", "name": "frowning face with open mouth"}, {
    "code": "1f627",
    "name": "anguished face"
}, {"code": "1f628", "name": "fearful face"}, {"code": "1f629", "name": "weary face"}, {
    "code": "1f62c",
    "name": "grimacing face"
}, {"code": "1f630", "name": "face with open mouth & cold sweat"}, {
    "code": "1f631",
    "name": "face screaming in fear"
}, {"code": "1f633", "name": "flushed face"}, {"code": "1f635", "name": "dizzy face"}, {
    "code": "1f621",
    "name": "pouting face"
}, {"code": "1f620", "name": "angry face"}, {"code": "1f607", "name": "smiling face with halo"}, {
    "code": "1f920",
    "name": "cowboy hat face"
}, {"code": "1f921", "name": "clown face"}, {"code": "1f925", "name": "lying face"}, {
    "code": "1f637",
    "name": "face with medical mask"
}, {"code": "1f912", "name": "face with thermometer"}, {
    "code": "1f915",
    "name": "face with head-bandage"
}, {"code": "1f922", "name": "nauseated face"}, {"code": "1f927", "name": "sneezing face"}, {
    "code": "1f608",
    "name": "smiling face with horns"
}, {"code": "1f47f", "name": "angry face with horns"}, {"code": "1f479", "name": "ogre"}, {
    "code": "1f47a",
    "name": "goblin"
}, {"code": "1f480", "name": "skull"}, {"code": "2620", "name": "skull and crossbones"}, {
    "code": "1f47b",
    "name": "ghost"
}, {"code": "1f47d", "name": "alien"}, {"code": "1f47e", "name": "alien monster"}, {
    "code": "1f916",
    "name": "robot face"
}, {"code": "1f4a9", "name": "pile of poo"}, {
    "code": "1f63a",
    "name": "smiling cat face with open mouth"
}, {"code": "1f638", "name": "grinning cat face with smiling eyes"}, {
    "code": "1f639",
    "name": "cat face with tears of joy"
}, {"code": "1f63b", "name": "smiling cat face with heart-eyes"}, {
    "code": "1f63c",
    "name": "cat face with wry smile"
}, {"code": "1f63d", "name": "kissing cat face with closed eyes"}, {
    "code": "1f640",
    "name": "weary cat face"
}, {"code": "1f63f", "name": "crying cat face"}, {"code": "1f63e", "name": "pouting cat face"}, {
    "code": "1f648",
    "name": "see-no-evil monkey"
}, {"code": "1f649", "name": "hear-no-evil monkey"}, {
    "code": "1f64a",
    "name": "speak-no-evil monkey"
}, {"code": "1f466", "name": "boy"}, {"code": "1f466_1f3fb", "name": "boy: light skin tone"}, {
    "code": "1f466_1f3fc",
    "name": "boy: medium-light skin tone"
}, {"code": "1f466_1f3fd", "name": "boy: medium skin tone"}, {
    "code": "1f466_1f3fe",
    "name": "boy: medium-dark skin tone"
}, {"code": "1f466_1f3ff", "name": "boy: dark skin tone"}, {"code": "1f467", "name": "girl"}, {
    "code": "1f467_1f3fb",
    "name": "girl: light skin tone"
}, {"code": "1f467_1f3fc", "name": "girl: medium-light skin tone"}, {
    "code": "1f467_1f3fd",
    "name": "girl: medium skin tone"
}, {"code": "1f467_1f3fe", "name": "girl: medium-dark skin tone"}, {
    "code": "1f467_1f3ff",
    "name": "girl: dark skin tone"
}, {"code": "1f468", "name": "man"}, {"code": "1f468_1f3fb", "name": "man: light skin tone"}, {
    "code": "1f468_1f3fc",
    "name": "man: medium-light skin tone"
}, {"code": "1f468_1f3fd", "name": "man: medium skin tone"}, {
    "code": "1f468_1f3fe",
    "name": "man: medium-dark skin tone"
}, {"code": "1f468_1f3ff", "name": "man: dark skin tone"}, {"code": "1f469", "name": "woman"}, {
    "code": "1f469_1f3fb",
    "name": "woman: light skin tone"
}, {"code": "1f469_1f3fc", "name": "woman: medium-light skin tone"}, {
    "code": "1f469_1f3fd",
    "name": "woman: medium skin tone"
}, {"code": "1f469_1f3fe", "name": "woman: medium-dark skin tone"}, {
    "code": "1f469_1f3ff",
    "name": "woman: dark skin tone"
}, {"code": "1f474", "name": "old man"}, {
    "code": "1f474_1f3fb",
    "name": "old man: light skin tone"
}, {"code": "1f474_1f3fc", "name": "old man: medium-light skin tone"}, {
    "code": "1f474_1f3fd",
    "name": "old man: medium skin tone"
}, {"code": "1f474_1f3fe", "name": "old man: medium-dark skin tone"}, {
    "code": "1f474_1f3ff",
    "name": "old man: dark skin tone"
}, {"code": "1f475", "name": "old woman"}, {
    "code": "1f475_1f3fb",
    "name": "old woman: light skin tone"
}, {"code": "1f475_1f3fc", "name": "old woman: medium-light skin tone"}, {
    "code": "1f475_1f3fd",
    "name": "old woman: medium skin tone"
}, {"code": "1f475_1f3fe", "name": "old woman: medium-dark skin tone"}, {
    "code": "1f475_1f3ff",
    "name": "old woman: dark skin tone"
}, {"code": "1f476", "name": "baby"}, {"code": "1f476_1f3fb", "name": "baby: light skin tone"}, {
    "code": "1f476_1f3fc",
    "name": "baby: medium-light skin tone"
}, {"code": "1f476_1f3fd", "name": "baby: medium skin tone"}, {
    "code": "1f476_1f3fe",
    "name": "baby: medium-dark skin tone"
}, {"code": "1f476_1f3ff", "name": "baby: dark skin tone"}, {
    "code": "1f47c",
    "name": "baby angel"
}, {"code": "1f47c_1f3fb", "name": "baby angel: light skin tone"}, {
    "code": "1f47c_1f3fc",
    "name": "baby angel: medium-light skin tone"
}, {"code": "1f47c_1f3fd", "name": "baby angel: medium skin tone"}, {
    "code": "1f47c_1f3fe",
    "name": "baby angel: medium-dark skin tone"
}, {"code": "1f47c_1f3ff", "name": "baby angel: dark skin tone"}, {
    "code": "1f468_200d_2695_fe0f",
    "name": "man health worker"
}, {
    "code": "1f468_1f3fb_200d_2695_fe0f",
    "name": "man health worker: light skin tone"
}, {
    "code": "1f468_1f3fc_200d_2695_fe0f",
    "name": "man health worker: medium-light skin tone"
}, {
    "code": "1f468_1f3fd_200d_2695_fe0f",
    "name": "man health worker: medium skin tone"
}, {
    "code": "1f468_1f3fe_200d_2695_fe0f",
    "name": "man health worker: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_2695_fe0f", "name": "man health worker: dark skin tone"}, {
    "code": "1f469_200d_2695_fe0f",
    "name": "woman health worker"
}, {
    "code": "1f469_1f3fb_200d_2695_fe0f",
    "name": "woman health worker: light skin tone"
}, {
    "code": "1f469_1f3fc_200d_2695_fe0f",
    "name": "woman health worker: medium-light skin tone"
}, {
    "code": "1f469_1f3fd_200d_2695_fe0f",
    "name": "woman health worker: medium skin tone"
}, {
    "code": "1f469_1f3fe_200d_2695_fe0f",
    "name": "woman health worker: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_2695_fe0f", "name": "woman health worker: dark skin tone"}, {
    "code": "1f468_200d_1f393",
    "name": "man student"
}, {"code": "1f468_1f3fb_200d_1f393", "name": "man student: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f393",
    "name": "man student: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f393", "name": "man student: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f393",
    "name": "man student: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f393", "name": "man student: dark skin tone"}, {
    "code": "1f469_200d_1f393",
    "name": "woman student"
}, {"code": "1f469_1f3fb_200d_1f393", "name": "woman student: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f393",
    "name": "woman student: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f393", "name": "woman student: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f393",
    "name": "woman student: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f393", "name": "woman student: dark skin tone"}, {
    "code": "1f468_200d_1f3eb",
    "name": "man teacher"
}, {"code": "1f468_1f3fb_200d_1f3eb", "name": "man teacher: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f3eb",
    "name": "man teacher: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f3eb", "name": "man teacher: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f3eb",
    "name": "man teacher: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f3eb", "name": "man teacher: dark skin tone"}, {
    "code": "1f469_200d_1f3eb",
    "name": "woman teacher"
}, {"code": "1f469_1f3fb_200d_1f3eb", "name": "woman teacher: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f3eb",
    "name": "woman teacher: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f3eb", "name": "woman teacher: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f3eb",
    "name": "woman teacher: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f3eb", "name": "woman teacher: dark skin tone"}, {
    "code": "1f468_200d_2696_fe0f",
    "name": "man judge"
}, {"code": "1f468_1f3fb_200d_2696_fe0f", "name": "man judge: light skin tone"}, {
    "code": "1f468_1f3fc_200d_2696_fe0f",
    "name": "man judge: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_2696_fe0f", "name": "man judge: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_2696_fe0f",
    "name": "man judge: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_2696_fe0f", "name": "man judge: dark skin tone"}, {
    "code": "1f469_200d_2696_fe0f",
    "name": "woman judge"
}, {
    "code": "1f469_1f3fb_200d_2696_fe0f",
    "name": "woman judge: light skin tone"
}, {
    "code": "1f469_1f3fc_200d_2696_fe0f",
    "name": "woman judge: medium-light skin tone"
}, {
    "code": "1f469_1f3fd_200d_2696_fe0f",
    "name": "woman judge: medium skin tone"
}, {
    "code": "1f469_1f3fe_200d_2696_fe0f",
    "name": "woman judge: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_2696_fe0f", "name": "woman judge: dark skin tone"}, {
    "code": "1f468_200d_1f33e",
    "name": "man farmer"
}, {"code": "1f468_1f3fb_200d_1f33e", "name": "man farmer: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f33e",
    "name": "man farmer: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f33e", "name": "man farmer: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f33e",
    "name": "man farmer: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f33e", "name": "man farmer: dark skin tone"}, {
    "code": "1f469_200d_1f33e",
    "name": "woman farmer"
}, {"code": "1f469_1f3fb_200d_1f33e", "name": "woman farmer: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f33e",
    "name": "woman farmer: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f33e", "name": "woman farmer: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f33e",
    "name": "woman farmer: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f33e", "name": "woman farmer: dark skin tone"}, {
    "code": "1f468_200d_1f373",
    "name": "man cook"
}, {"code": "1f468_1f3fb_200d_1f373", "name": "man cook: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f373",
    "name": "man cook: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f373", "name": "man cook: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f373",
    "name": "man cook: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f373", "name": "man cook: dark skin tone"}, {
    "code": "1f469_200d_1f373",
    "name": "woman cook"
}, {"code": "1f469_1f3fb_200d_1f373", "name": "woman cook: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f373",
    "name": "woman cook: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f373", "name": "woman cook: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f373",
    "name": "woman cook: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f373", "name": "woman cook: dark skin tone"}, {
    "code": "1f468_200d_1f527",
    "name": "man mechanic"
}, {"code": "1f468_1f3fb_200d_1f527", "name": "man mechanic: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f527",
    "name": "man mechanic: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f527", "name": "man mechanic: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f527",
    "name": "man mechanic: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f527", "name": "man mechanic: dark skin tone"}, {
    "code": "1f469_200d_1f527",
    "name": "woman mechanic"
}, {"code": "1f469_1f3fb_200d_1f527", "name": "woman mechanic: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f527",
    "name": "woman mechanic: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f527", "name": "woman mechanic: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f527",
    "name": "woman mechanic: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f527", "name": "woman mechanic: dark skin tone"}, {
    "code": "1f468_200d_1f3ed",
    "name": "man factory worker"
}, {"code": "1f468_1f3fb_200d_1f3ed", "name": "man factory worker: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f3ed",
    "name": "man factory worker: medium-light skin tone"
}, {
    "code": "1f468_1f3fd_200d_1f3ed",
    "name": "man factory worker: medium skin tone"
}, {
    "code": "1f468_1f3fe_200d_1f3ed",
    "name": "man factory worker: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f3ed", "name": "man factory worker: dark skin tone"}, {
    "code": "1f469_200d_1f3ed",
    "name": "woman factory worker"
}, {
    "code": "1f469_1f3fb_200d_1f3ed",
    "name": "woman factory worker: light skin tone"
}, {
    "code": "1f469_1f3fc_200d_1f3ed",
    "name": "woman factory worker: medium-light skin tone"
}, {
    "code": "1f469_1f3fd_200d_1f3ed",
    "name": "woman factory worker: medium skin tone"
}, {
    "code": "1f469_1f3fe_200d_1f3ed",
    "name": "woman factory worker: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f3ed", "name": "woman factory worker: dark skin tone"}, {
    "code": "1f468_200d_1f4bc",
    "name": "man office worker"
}, {"code": "1f468_1f3fb_200d_1f4bc", "name": "man office worker: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f4bc",
    "name": "man office worker: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f4bc", "name": "man office worker: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f4bc",
    "name": "man office worker: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f4bc", "name": "man office worker: dark skin tone"}, {
    "code": "1f469_200d_1f4bc",
    "name": "woman office worker"
}, {
    "code": "1f469_1f3fb_200d_1f4bc",
    "name": "woman office worker: light skin tone"
}, {
    "code": "1f469_1f3fc_200d_1f4bc",
    "name": "woman office worker: medium-light skin tone"
}, {
    "code": "1f469_1f3fd_200d_1f4bc",
    "name": "woman office worker: medium skin tone"
}, {
    "code": "1f469_1f3fe_200d_1f4bc",
    "name": "woman office worker: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f4bc", "name": "woman office worker: dark skin tone"}, {
    "code": "1f468_200d_1f52c",
    "name": "man scientist"
}, {"code": "1f468_1f3fb_200d_1f52c", "name": "man scientist: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f52c",
    "name": "man scientist: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f52c", "name": "man scientist: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f52c",
    "name": "man scientist: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f52c", "name": "man scientist: dark skin tone"}, {
    "code": "1f469_200d_1f52c",
    "name": "woman scientist"
}, {"code": "1f469_1f3fb_200d_1f52c", "name": "woman scientist: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f52c",
    "name": "woman scientist: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f52c", "name": "woman scientist: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f52c",
    "name": "woman scientist: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f52c", "name": "woman scientist: dark skin tone"}, {
    "code": "1f468_200d_1f4bb",
    "name": "man technologist"
}, {"code": "1f468_1f3fb_200d_1f4bb", "name": "man technologist: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f4bb",
    "name": "man technologist: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f4bb", "name": "man technologist: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f4bb",
    "name": "man technologist: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f4bb", "name": "man technologist: dark skin tone"}, {
    "code": "1f469_200d_1f4bb",
    "name": "woman technologist"
}, {"code": "1f469_1f3fb_200d_1f4bb", "name": "woman technologist: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f4bb",
    "name": "woman technologist: medium-light skin tone"
}, {
    "code": "1f469_1f3fd_200d_1f4bb",
    "name": "woman technologist: medium skin tone"
}, {
    "code": "1f469_1f3fe_200d_1f4bb",
    "name": "woman technologist: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f4bb", "name": "woman technologist: dark skin tone"}, {
    "code": "1f468_200d_1f3a4",
    "name": "man singer"
}, {"code": "1f468_1f3fb_200d_1f3a4", "name": "man singer: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f3a4",
    "name": "man singer: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f3a4", "name": "man singer: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f3a4",
    "name": "man singer: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f3a4", "name": "man singer: dark skin tone"}, {
    "code": "1f469_200d_1f3a4",
    "name": "woman singer"
}, {"code": "1f469_1f3fb_200d_1f3a4", "name": "woman singer: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f3a4",
    "name": "woman singer: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f3a4", "name": "woman singer: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f3a4",
    "name": "woman singer: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f3a4", "name": "woman singer: dark skin tone"}, {
    "code": "1f468_200d_1f3a8",
    "name": "man artist"
}, {"code": "1f468_1f3fb_200d_1f3a8", "name": "man artist: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f3a8",
    "name": "man artist: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f3a8", "name": "man artist: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f3a8",
    "name": "man artist: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f3a8", "name": "man artist: dark skin tone"}, {
    "code": "1f469_200d_1f3a8",
    "name": "woman artist"
}, {"code": "1f469_1f3fb_200d_1f3a8", "name": "woman artist: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f3a8",
    "name": "woman artist: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f3a8", "name": "woman artist: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f3a8",
    "name": "woman artist: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f3a8", "name": "woman artist: dark skin tone"}, {
    "code": "1f468_200d_2708_fe0f",
    "name": "man pilot"
}, {"code": "1f468_1f3fb_200d_2708_fe0f", "name": "man pilot: light skin tone"}, {
    "code": "1f468_1f3fc_200d_2708_fe0f",
    "name": "man pilot: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_2708_fe0f", "name": "man pilot: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_2708_fe0f",
    "name": "man pilot: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_2708_fe0f", "name": "man pilot: dark skin tone"}, {
    "code": "1f469_200d_2708_fe0f",
    "name": "woman pilot"
}, {
    "code": "1f469_1f3fb_200d_2708_fe0f",
    "name": "woman pilot: light skin tone"
}, {
    "code": "1f469_1f3fc_200d_2708_fe0f",
    "name": "woman pilot: medium-light skin tone"
}, {
    "code": "1f469_1f3fd_200d_2708_fe0f",
    "name": "woman pilot: medium skin tone"
}, {
    "code": "1f469_1f3fe_200d_2708_fe0f",
    "name": "woman pilot: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_2708_fe0f", "name": "woman pilot: dark skin tone"}, {
    "code": "1f468_200d_1f680",
    "name": "man astronaut"
}, {"code": "1f468_1f3fb_200d_1f680", "name": "man astronaut: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f680",
    "name": "man astronaut: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f680", "name": "man astronaut: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f680",
    "name": "man astronaut: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f680", "name": "man astronaut: dark skin tone"}, {
    "code": "1f469_200d_1f680",
    "name": "woman astronaut"
}, {"code": "1f469_1f3fb_200d_1f680", "name": "woman astronaut: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f680",
    "name": "woman astronaut: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f680", "name": "woman astronaut: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f680",
    "name": "woman astronaut: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f680", "name": "woman astronaut: dark skin tone"}, {
    "code": "1f468_200d_1f692",
    "name": "man firefighter"
}, {"code": "1f468_1f3fb_200d_1f692", "name": "man firefighter: light skin tone"}, {
    "code": "1f468_1f3fc_200d_1f692",
    "name": "man firefighter: medium-light skin tone"
}, {"code": "1f468_1f3fd_200d_1f692", "name": "man firefighter: medium skin tone"}, {
    "code": "1f468_1f3fe_200d_1f692",
    "name": "man firefighter: medium-dark skin tone"
}, {"code": "1f468_1f3ff_200d_1f692", "name": "man firefighter: dark skin tone"}, {
    "code": "1f469_200d_1f692",
    "name": "woman firefighter"
}, {"code": "1f469_1f3fb_200d_1f692", "name": "woman firefighter: light skin tone"}, {
    "code": "1f469_1f3fc_200d_1f692",
    "name": "woman firefighter: medium-light skin tone"
}, {"code": "1f469_1f3fd_200d_1f692", "name": "woman firefighter: medium skin tone"}, {
    "code": "1f469_1f3fe_200d_1f692",
    "name": "woman firefighter: medium-dark skin tone"
}, {"code": "1f469_1f3ff_200d_1f692", "name": "woman firefighter: dark skin tone"}, {
    "code": "1f46e",
    "name": "police officer"
}, {"code": "1f46e_1f3fb", "name": "police officer: light skin tone"}, {
    "code": "1f46e_1f3fc",
    "name": "police officer: medium-light skin tone"
}, {"code": "1f46e_1f3fd", "name": "police officer: medium skin tone"}, {
    "code": "1f46e_1f3fe",
    "name": "police officer: medium-dark skin tone"
}, {"code": "1f46e_1f3ff", "name": "police officer: dark skin tone"}, {
    "code": "1f46e_200d_2642_fe0f",
    "name": "man police officer"
}, {
    "code": "1f46e_1f3fb_200d_2642_fe0f",
    "name": "man police officer: light skin tone"
}, {
    "code": "1f46e_1f3fc_200d_2642_fe0f",
    "name": "man police officer: medium-light skin tone"
}, {
    "code": "1f46e_1f3fd_200d_2642_fe0f",
    "name": "man police officer: medium skin tone"
}, {
    "code": "1f46e_1f3fe_200d_2642_fe0f",
    "name": "man police officer: medium-dark skin tone"
}, {
    "code": "1f46e_1f3ff_200d_2642_fe0f",
    "name": "man police officer: dark skin tone"
}, {"code": "1f46e_200d_2640_fe0f", "name": "woman police officer"}, {
    "code": "1f46e_1f3fb_200d_2640_fe0f",
    "name": "woman police officer: light skin tone"
}, {
    "code": "1f46e_1f3fc_200d_2640_fe0f",
    "name": "woman police officer: medium-light skin tone"
}, {
    "code": "1f46e_1f3fd_200d_2640_fe0f",
    "name": "woman police officer: medium skin tone"
}, {
    "code": "1f46e_1f3fe_200d_2640_fe0f",
    "name": "woman police officer: medium-dark skin tone"
}, {"code": "1f46e_1f3ff_200d_2640_fe0f", "name": "woman police officer: dark skin tone"}, {
    "code": "1f575",
    "name": "detective"
}, {"code": "1f575_1f3fb", "name": "detective: light skin tone"}, {
    "code": "1f575_1f3fc",
    "name": "detective: medium-light skin tone"
}, {"code": "1f575_1f3fd", "name": "detective: medium skin tone"}, {
    "code": "1f575_1f3fe",
    "name": "detective: medium-dark skin tone"
}, {"code": "1f575_1f3ff", "name": "detective: dark skin tone"}, {
    "code": "1f575_fe0f_200d_2642_fe0f",
    "name": "man detective"
}, {
    "code": "1f575_1f3fb_200d_2642_fe0f",
    "name": "man detective: light skin tone"
}, {
    "code": "1f575_1f3fc_200d_2642_fe0f",
    "name": "man detective: medium-light skin tone"
}, {
    "code": "1f575_1f3fd_200d_2642_fe0f",
    "name": "man detective: medium skin tone"
}, {
    "code": "1f575_1f3fe_200d_2642_fe0f",
    "name": "man detective: medium-dark skin tone"
}, {
    "code": "1f575_1f3ff_200d_2642_fe0f",
    "name": "man detective: dark skin tone"
}, {"code": "1f575_fe0f_200d_2640_fe0f", "name": "woman detective"}, {
    "code": "1f575_1f3fb_200d_2640_fe0f",
    "name": "woman detective: light skin tone"
}, {
    "code": "1f575_1f3fc_200d_2640_fe0f",
    "name": "woman detective: medium-light skin tone"
}, {
    "code": "1f575_1f3fd_200d_2640_fe0f",
    "name": "woman detective: medium skin tone"
}, {
    "code": "1f575_1f3fe_200d_2640_fe0f",
    "name": "woman detective: medium-dark skin tone"
}, {"code": "1f575_1f3ff_200d_2640_fe0f", "name": "woman detective: dark skin tone"}, {
    "code": "1f482",
    "name": "guard"
}, {"code": "1f482_1f3fb", "name": "guard: light skin tone"}, {
    "code": "1f482_1f3fc",
    "name": "guard: medium-light skin tone"
}, {"code": "1f482_1f3fd", "name": "guard: medium skin tone"}, {
    "code": "1f482_1f3fe",
    "name": "guard: medium-dark skin tone"
}, {"code": "1f482_1f3ff", "name": "guard: dark skin tone"}, {
    "code": "1f482_200d_2642_fe0f",
    "name": "man guard"
}, {"code": "1f482_1f3fb_200d_2642_fe0f", "name": "man guard: light skin tone"}, {
    "code": "1f482_1f3fc_200d_2642_fe0f",
    "name": "man guard: medium-light skin tone"
}, {"code": "1f482_1f3fd_200d_2642_fe0f", "name": "man guard: medium skin tone"}, {
    "code": "1f482_1f3fe_200d_2642_fe0f",
    "name": "man guard: medium-dark skin tone"
}, {"code": "1f482_1f3ff_200d_2642_fe0f", "name": "man guard: dark skin tone"}, {
    "code": "1f482_200d_2640_fe0f",
    "name": "woman guard"
}, {
    "code": "1f482_1f3fb_200d_2640_fe0f",
    "name": "woman guard: light skin tone"
}, {
    "code": "1f482_1f3fc_200d_2640_fe0f",
    "name": "woman guard: medium-light skin tone"
}, {
    "code": "1f482_1f3fd_200d_2640_fe0f",
    "name": "woman guard: medium skin tone"
}, {
    "code": "1f482_1f3fe_200d_2640_fe0f",
    "name": "woman guard: medium-dark skin tone"
}, {"code": "1f482_1f3ff_200d_2640_fe0f", "name": "woman guard: dark skin tone"}, {
    "code": "1f477",
    "name": "construction worker"
}, {"code": "1f477_1f3fb", "name": "construction worker: light skin tone"}, {
    "code": "1f477_1f3fc",
    "name": "construction worker: medium-light skin tone"
}, {"code": "1f477_1f3fd", "name": "construction worker: medium skin tone"}, {
    "code": "1f477_1f3fe",
    "name": "construction worker: medium-dark skin tone"
}, {"code": "1f477_1f3ff", "name": "construction worker: dark skin tone"}, {
    "code": "1f477_200d_2642_fe0f",
    "name": "man construction worker"
}, {
    "code": "1f477_1f3fb_200d_2642_fe0f",
    "name": "man construction worker: light skin tone"
}, {
    "code": "1f477_1f3fc_200d_2642_fe0f",
    "name": "man construction worker: medium-light skin tone"
}, {
    "code": "1f477_1f3fd_200d_2642_fe0f",
    "name": "man construction worker: medium skin tone"
}, {
    "code": "1f477_1f3fe_200d_2642_fe0f",
    "name": "man construction worker: medium-dark skin tone"
}, {
    "code": "1f477_1f3ff_200d_2642_fe0f",
    "name": "man construction worker: dark skin tone"
}, {"code": "1f477_200d_2640_fe0f", "name": "woman construction worker"}, {
    "code": "1f477_1f3fb_200d_2640_fe0f",
    "name": "woman construction worker: light skin tone"
}, {
    "code": "1f477_1f3fc_200d_2640_fe0f",
    "name": "woman construction worker: medium-light skin tone"
}, {
    "code": "1f477_1f3fd_200d_2640_fe0f",
    "name": "woman construction worker: medium skin tone"
}, {
    "code": "1f477_1f3fe_200d_2640_fe0f",
    "name": "woman construction worker: medium-dark skin tone"
}, {"code": "1f477_1f3ff_200d_2640_fe0f", "name": "woman construction worker: dark skin tone"}, {
    "code": "1f473",
    "name": "person wearing turban"
}, {"code": "1f473_1f3fb", "name": "person wearing turban: light skin tone"}, {
    "code": "1f473_1f3fc",
    "name": "person wearing turban: medium-light skin tone"
}, {"code": "1f473_1f3fd", "name": "person wearing turban: medium skin tone"}, {
    "code": "1f473_1f3fe",
    "name": "person wearing turban: medium-dark skin tone"
}, {"code": "1f473_1f3ff", "name": "person wearing turban: dark skin tone"}, {
    "code": "1f473_200d_2642_fe0f",
    "name": "man wearing turban"
}, {
    "code": "1f473_1f3fb_200d_2642_fe0f",
    "name": "man wearing turban: light skin tone"
}, {
    "code": "1f473_1f3fc_200d_2642_fe0f",
    "name": "man wearing turban: medium-light skin tone"
}, {
    "code": "1f473_1f3fd_200d_2642_fe0f",
    "name": "man wearing turban: medium skin tone"
}, {
    "code": "1f473_1f3fe_200d_2642_fe0f",
    "name": "man wearing turban: medium-dark skin tone"
}, {
    "code": "1f473_1f3ff_200d_2642_fe0f",
    "name": "man wearing turban: dark skin tone"
}, {"code": "1f473_200d_2640_fe0f", "name": "woman wearing turban"}, {
    "code": "1f473_1f3fb_200d_2640_fe0f",
    "name": "woman wearing turban: light skin tone"
}, {
    "code": "1f473_1f3fc_200d_2640_fe0f",
    "name": "woman wearing turban: medium-light skin tone"
}, {
    "code": "1f473_1f3fd_200d_2640_fe0f",
    "name": "woman wearing turban: medium skin tone"
}, {
    "code": "1f473_1f3fe_200d_2640_fe0f",
    "name": "woman wearing turban: medium-dark skin tone"
}, {"code": "1f473_1f3ff_200d_2640_fe0f", "name": "woman wearing turban: dark skin tone"}, {
    "code": "1f471",
    "name": "blond-haired person"
}, {"code": "1f471_1f3fb", "name": "blond-haired person: light skin tone"}, {
    "code": "1f471_1f3fc",
    "name": "blond-haired person: medium-light skin tone"
}, {"code": "1f471_1f3fd", "name": "blond-haired person: medium skin tone"}, {
    "code": "1f471_1f3fe",
    "name": "blond-haired person: medium-dark skin tone"
}, {"code": "1f471_1f3ff", "name": "blond-haired person: dark skin tone"}, {
    "code": "1f471_200d_2642_fe0f",
    "name": "blond-haired man"
}, {
    "code": "1f471_1f3fb_200d_2642_fe0f",
    "name": "blond-haired man: light skin tone"
}, {
    "code": "1f471_1f3fc_200d_2642_fe0f",
    "name": "blond-haired man: medium-light skin tone"
}, {
    "code": "1f471_1f3fd_200d_2642_fe0f",
    "name": "blond-haired man: medium skin tone"
}, {
    "code": "1f471_1f3fe_200d_2642_fe0f",
    "name": "blond-haired man: medium-dark skin tone"
}, {"code": "1f471_1f3ff_200d_2642_fe0f", "name": "blond-haired man: dark skin tone"}, {
    "code": "1f471_200d_2640_fe0f",
    "name": "blond-haired woman"
}, {
    "code": "1f471_1f3fb_200d_2640_fe0f",
    "name": "blond-haired woman: light skin tone"
}, {
    "code": "1f471_1f3fc_200d_2640_fe0f",
    "name": "blond-haired woman: medium-light skin tone"
}, {
    "code": "1f471_1f3fd_200d_2640_fe0f",
    "name": "blond-haired woman: medium skin tone"
}, {
    "code": "1f471_1f3fe_200d_2640_fe0f",
    "name": "blond-haired woman: medium-dark skin tone"
}, {"code": "1f471_1f3ff_200d_2640_fe0f", "name": "blond-haired woman: dark skin tone"}, {
    "code": "1f385",
    "name": "Santa Claus"
}, {"code": "1f385_1f3fb", "name": "Santa Claus: light skin tone"}, {
    "code": "1f385_1f3fc",
    "name": "Santa Claus: medium-light skin tone"
}, {"code": "1f385_1f3fd", "name": "Santa Claus: medium skin tone"}, {
    "code": "1f385_1f3fe",
    "name": "Santa Claus: medium-dark skin tone"
}, {"code": "1f385_1f3ff", "name": "Santa Claus: dark skin tone"}, {
    "code": "1f936",
    "name": "Mrs. Claus"
}, {"code": "1f936_1f3fb", "name": "Mrs. Claus: light skin tone"}, {
    "code": "1f936_1f3fc",
    "name": "Mrs. Claus: medium-light skin tone"
}, {"code": "1f936_1f3fd", "name": "Mrs. Claus: medium skin tone"}, {
    "code": "1f936_1f3fe",
    "name": "Mrs. Claus: medium-dark skin tone"
}, {"code": "1f936_1f3ff", "name": "Mrs. Claus: dark skin tone"}, {
    "code": "1f478",
    "name": "princess"
}, {"code": "1f478_1f3fb", "name": "princess: light skin tone"}, {
    "code": "1f478_1f3fc",
    "name": "princess: medium-light skin tone"
}, {"code": "1f478_1f3fd", "name": "princess: medium skin tone"}, {
    "code": "1f478_1f3fe",
    "name": "princess: medium-dark skin tone"
}, {"code": "1f478_1f3ff", "name": "princess: dark skin tone"}, {
    "code": "1f934",
    "name": "prince"
}, {"code": "1f934_1f3fb", "name": "prince: light skin tone"}, {
    "code": "1f934_1f3fc",
    "name": "prince: medium-light skin tone"
}, {"code": "1f934_1f3fd", "name": "prince: medium skin tone"}, {
    "code": "1f934_1f3fe",
    "name": "prince: medium-dark skin tone"
}, {"code": "1f934_1f3ff", "name": "prince: dark skin tone"}, {
    "code": "1f470",
    "name": "bride with veil"
}, {"code": "1f470_1f3fb", "name": "bride with veil: light skin tone"}, {
    "code": "1f470_1f3fc",
    "name": "bride with veil: medium-light skin tone"
}, {"code": "1f470_1f3fd", "name": "bride with veil: medium skin tone"}, {
    "code": "1f470_1f3fe",
    "name": "bride with veil: medium-dark skin tone"
}, {"code": "1f470_1f3ff", "name": "bride with veil: dark skin tone"}, {
    "code": "1f935",
    "name": "man in tuxedo"
}, {"code": "1f935_1f3fb", "name": "man in tuxedo: light skin tone"}, {
    "code": "1f935_1f3fc",
    "name": "man in tuxedo: medium-light skin tone"
}, {"code": "1f935_1f3fd", "name": "man in tuxedo: medium skin tone"}, {
    "code": "1f935_1f3fe",
    "name": "man in tuxedo: medium-dark skin tone"
}, {"code": "1f935_1f3ff", "name": "man in tuxedo: dark skin tone"}, {
    "code": "1f930",
    "name": "pregnant woman"
}, {"code": "1f930_1f3fb", "name": "pregnant woman: light skin tone"}, {
    "code": "1f930_1f3fc",
    "name": "pregnant woman: medium-light skin tone"
}, {"code": "1f930_1f3fd", "name": "pregnant woman: medium skin tone"}, {
    "code": "1f930_1f3fe",
    "name": "pregnant woman: medium-dark skin tone"
}, {"code": "1f930_1f3ff", "name": "pregnant woman: dark skin tone"}, {
    "code": "1f472",
    "name": "man with Chinese cap"
}, {"code": "1f472_1f3fb", "name": "man with Chinese cap: light skin tone"}, {
    "code": "1f472_1f3fc",
    "name": "man with Chinese cap: medium-light skin tone"
}, {"code": "1f472_1f3fd", "name": "man with Chinese cap: medium skin tone"}, {
    "code": "1f472_1f3fe",
    "name": "man with Chinese cap: medium-dark skin tone"
}, {"code": "1f472_1f3ff", "name": "man with Chinese cap: dark skin tone"}, {
    "code": "1f64d",
    "name": "person frowning"
}, {"code": "1f64d_1f3fb", "name": "person frowning: light skin tone"}, {
    "code": "1f64d_1f3fc",
    "name": "person frowning: medium-light skin tone"
}, {"code": "1f64d_1f3fd", "name": "person frowning: medium skin tone"}, {
    "code": "1f64d_1f3fe",
    "name": "person frowning: medium-dark skin tone"
}, {"code": "1f64d_1f3ff", "name": "person frowning: dark skin tone"}, {
    "code": "1f64d_200d_2642_fe0f",
    "name": "man frowning"
}, {
    "code": "1f64d_1f3fb_200d_2642_fe0f",
    "name": "man frowning: light skin tone"
}, {
    "code": "1f64d_1f3fc_200d_2642_fe0f",
    "name": "man frowning: medium-light skin tone"
}, {
    "code": "1f64d_1f3fd_200d_2642_fe0f",
    "name": "man frowning: medium skin tone"
}, {
    "code": "1f64d_1f3fe_200d_2642_fe0f",
    "name": "man frowning: medium-dark skin tone"
}, {"code": "1f64d_1f3ff_200d_2642_fe0f", "name": "man frowning: dark skin tone"}, {
    "code": "1f64d_200d_2640_fe0f",
    "name": "woman frowning"
}, {
    "code": "1f64d_1f3fb_200d_2640_fe0f",
    "name": "woman frowning: light skin tone"
}, {
    "code": "1f64d_1f3fc_200d_2640_fe0f",
    "name": "woman frowning: medium-light skin tone"
}, {
    "code": "1f64d_1f3fd_200d_2640_fe0f",
    "name": "woman frowning: medium skin tone"
}, {
    "code": "1f64d_1f3fe_200d_2640_fe0f",
    "name": "woman frowning: medium-dark skin tone"
}, {"code": "1f64d_1f3ff_200d_2640_fe0f", "name": "woman frowning: dark skin tone"}, {
    "code": "1f64e",
    "name": "person pouting"
}, {"code": "1f64e_1f3fb", "name": "person pouting: light skin tone"}, {
    "code": "1f64e_1f3fc",
    "name": "person pouting: medium-light skin tone"
}, {"code": "1f64e_1f3fd", "name": "person pouting: medium skin tone"}, {
    "code": "1f64e_1f3fe",
    "name": "person pouting: medium-dark skin tone"
}, {"code": "1f64e_1f3ff", "name": "person pouting: dark skin tone"}, {
    "code": "1f64e_200d_2642_fe0f",
    "name": "man pouting"
}, {
    "code": "1f64e_1f3fb_200d_2642_fe0f",
    "name": "man pouting: light skin tone"
}, {
    "code": "1f64e_1f3fc_200d_2642_fe0f",
    "name": "man pouting: medium-light skin tone"
}, {
    "code": "1f64e_1f3fd_200d_2642_fe0f",
    "name": "man pouting: medium skin tone"
}, {
    "code": "1f64e_1f3fe_200d_2642_fe0f",
    "name": "man pouting: medium-dark skin tone"
}, {"code": "1f64e_1f3ff_200d_2642_fe0f", "name": "man pouting: dark skin tone"}, {
    "code": "1f64e_200d_2640_fe0f",
    "name": "woman pouting"
}, {
    "code": "1f64e_1f3fb_200d_2640_fe0f",
    "name": "woman pouting: light skin tone"
}, {
    "code": "1f64e_1f3fc_200d_2640_fe0f",
    "name": "woman pouting: medium-light skin tone"
}, {
    "code": "1f64e_1f3fd_200d_2640_fe0f",
    "name": "woman pouting: medium skin tone"
}, {
    "code": "1f64e_1f3fe_200d_2640_fe0f",
    "name": "woman pouting: medium-dark skin tone"
}, {"code": "1f64e_1f3ff_200d_2640_fe0f", "name": "woman pouting: dark skin tone"}, {
    "code": "1f645",
    "name": "person gesturing NO"
}, {"code": "1f645_1f3fb", "name": "person gesturing NO: light skin tone"}, {
    "code": "1f645_1f3fc",
    "name": "person gesturing NO: medium-light skin tone"
}, {"code": "1f645_1f3fd", "name": "person gesturing NO: medium skin tone"}, {
    "code": "1f645_1f3fe",
    "name": "person gesturing NO: medium-dark skin tone"
}, {"code": "1f645_1f3ff", "name": "person gesturing NO: dark skin tone"}, {
    "code": "1f645_200d_2642_fe0f",
    "name": "man gesturing NO"
}, {
    "code": "1f645_1f3fb_200d_2642_fe0f",
    "name": "man gesturing NO: light skin tone"
}, {
    "code": "1f645_1f3fc_200d_2642_fe0f",
    "name": "man gesturing NO: medium-light skin tone"
}, {
    "code": "1f645_1f3fd_200d_2642_fe0f",
    "name": "man gesturing NO: medium skin tone"
}, {
    "code": "1f645_1f3fe_200d_2642_fe0f",
    "name": "man gesturing NO: medium-dark skin tone"
}, {"code": "1f645_1f3ff_200d_2642_fe0f", "name": "man gesturing NO: dark skin tone"}, {
    "code": "1f645_200d_2640_fe0f",
    "name": "woman gesturing NO"
}, {
    "code": "1f645_1f3fb_200d_2640_fe0f",
    "name": "woman gesturing NO: light skin tone"
}, {
    "code": "1f645_1f3fc_200d_2640_fe0f",
    "name": "woman gesturing NO: medium-light skin tone"
}, {
    "code": "1f645_1f3fd_200d_2640_fe0f",
    "name": "woman gesturing NO: medium skin tone"
}, {
    "code": "1f645_1f3fe_200d_2640_fe0f",
    "name": "woman gesturing NO: medium-dark skin tone"
}, {"code": "1f645_1f3ff_200d_2640_fe0f", "name": "woman gesturing NO: dark skin tone"}, {
    "code": "1f646",
    "name": "person gesturing OK"
}, {"code": "1f646_1f3fb", "name": "person gesturing OK: light skin tone"}, {
    "code": "1f646_1f3fc",
    "name": "person gesturing OK: medium-light skin tone"
}, {"code": "1f646_1f3fd", "name": "person gesturing OK: medium skin tone"}, {
    "code": "1f646_1f3fe",
    "name": "person gesturing OK: medium-dark skin tone"
}, {"code": "1f646_1f3ff", "name": "person gesturing OK: dark skin tone"}, {
    "code": "1f646_200d_2642_fe0f",
    "name": "man gesturing OK"
}, {
    "code": "1f646_1f3fb_200d_2642_fe0f",
    "name": "man gesturing OK: light skin tone"
}, {
    "code": "1f646_1f3fc_200d_2642_fe0f",
    "name": "man gesturing OK: medium-light skin tone"
}, {
    "code": "1f646_1f3fd_200d_2642_fe0f",
    "name": "man gesturing OK: medium skin tone"
}, {
    "code": "1f646_1f3fe_200d_2642_fe0f",
    "name": "man gesturing OK: medium-dark skin tone"
}, {"code": "1f646_1f3ff_200d_2642_fe0f", "name": "man gesturing OK: dark skin tone"}, {
    "code": "1f646_200d_2640_fe0f",
    "name": "woman gesturing OK"
}, {
    "code": "1f646_1f3fb_200d_2640_fe0f",
    "name": "woman gesturing OK: light skin tone"
}, {
    "code": "1f646_1f3fc_200d_2640_fe0f",
    "name": "woman gesturing OK: medium-light skin tone"
}, {
    "code": "1f646_1f3fd_200d_2640_fe0f",
    "name": "woman gesturing OK: medium skin tone"
}, {
    "code": "1f646_1f3fe_200d_2640_fe0f",
    "name": "woman gesturing OK: medium-dark skin tone"
}, {"code": "1f646_1f3ff_200d_2640_fe0f", "name": "woman gesturing OK: dark skin tone"}, {
    "code": "1f481",
    "name": "person tipping hand"
}, {"code": "1f481_1f3fb", "name": "person tipping hand: light skin tone"}, {
    "code": "1f481_1f3fc",
    "name": "person tipping hand: medium-light skin tone"
}, {"code": "1f481_1f3fd", "name": "person tipping hand: medium skin tone"}, {
    "code": "1f481_1f3fe",
    "name": "person tipping hand: medium-dark skin tone"
}, {"code": "1f481_1f3ff", "name": "person tipping hand: dark skin tone"}, {
    "code": "1f481_200d_2642_fe0f",
    "name": "man tipping hand"
}, {
    "code": "1f481_1f3fb_200d_2642_fe0f",
    "name": "man tipping hand: light skin tone"
}, {
    "code": "1f481_1f3fc_200d_2642_fe0f",
    "name": "man tipping hand: medium-light skin tone"
}, {
    "code": "1f481_1f3fd_200d_2642_fe0f",
    "name": "man tipping hand: medium skin tone"
}, {
    "code": "1f481_1f3fe_200d_2642_fe0f",
    "name": "man tipping hand: medium-dark skin tone"
}, {"code": "1f481_1f3ff_200d_2642_fe0f", "name": "man tipping hand: dark skin tone"}, {
    "code": "1f481_200d_2640_fe0f",
    "name": "woman tipping hand"
}, {
    "code": "1f481_1f3fb_200d_2640_fe0f",
    "name": "woman tipping hand: light skin tone"
}, {
    "code": "1f481_1f3fc_200d_2640_fe0f",
    "name": "woman tipping hand: medium-light skin tone"
}, {
    "code": "1f481_1f3fd_200d_2640_fe0f",
    "name": "woman tipping hand: medium skin tone"
}, {
    "code": "1f481_1f3fe_200d_2640_fe0f",
    "name": "woman tipping hand: medium-dark skin tone"
}, {"code": "1f481_1f3ff_200d_2640_fe0f", "name": "woman tipping hand: dark skin tone"}, {
    "code": "1f64b",
    "name": "person raising hand"
}, {"code": "1f64b_1f3fb", "name": "person raising hand: light skin tone"}, {
    "code": "1f64b_1f3fc",
    "name": "person raising hand: medium-light skin tone"
}, {"code": "1f64b_1f3fd", "name": "person raising hand: medium skin tone"}, {
    "code": "1f64b_1f3fe",
    "name": "person raising hand: medium-dark skin tone"
}, {"code": "1f64b_1f3ff", "name": "person raising hand: dark skin tone"}, {
    "code": "1f64b_200d_2642_fe0f",
    "name": "man raising hand"
}, {
    "code": "1f64b_1f3fb_200d_2642_fe0f",
    "name": "man raising hand: light skin tone"
}, {
    "code": "1f64b_1f3fc_200d_2642_fe0f",
    "name": "man raising hand: medium-light skin tone"
}, {
    "code": "1f64b_1f3fd_200d_2642_fe0f",
    "name": "man raising hand: medium skin tone"
}, {
    "code": "1f64b_1f3fe_200d_2642_fe0f",
    "name": "man raising hand: medium-dark skin tone"
}, {"code": "1f64b_1f3ff_200d_2642_fe0f", "name": "man raising hand: dark skin tone"}, {
    "code": "1f64b_200d_2640_fe0f",
    "name": "woman raising hand"
}, {
    "code": "1f64b_1f3fb_200d_2640_fe0f",
    "name": "woman raising hand: light skin tone"
}, {
    "code": "1f64b_1f3fc_200d_2640_fe0f",
    "name": "woman raising hand: medium-light skin tone"
}, {
    "code": "1f64b_1f3fd_200d_2640_fe0f",
    "name": "woman raising hand: medium skin tone"
}, {
    "code": "1f64b_1f3fe_200d_2640_fe0f",
    "name": "woman raising hand: medium-dark skin tone"
}, {"code": "1f64b_1f3ff_200d_2640_fe0f", "name": "woman raising hand: dark skin tone"}, {
    "code": "1f647",
    "name": "person bowing"
}, {"code": "1f647_1f3fb", "name": "person bowing: light skin tone"}, {
    "code": "1f647_1f3fc",
    "name": "person bowing: medium-light skin tone"
}, {"code": "1f647_1f3fd", "name": "person bowing: medium skin tone"}, {
    "code": "1f647_1f3fe",
    "name": "person bowing: medium-dark skin tone"
}, {"code": "1f647_1f3ff", "name": "person bowing: dark skin tone"}, {
    "code": "1f647_200d_2642_fe0f",
    "name": "man bowing"
}, {"code": "1f647_1f3fb_200d_2642_fe0f", "name": "man bowing: light skin tone"}, {
    "code": "1f647_1f3fc_200d_2642_fe0f",
    "name": "man bowing: medium-light skin tone"
}, {
    "code": "1f647_1f3fd_200d_2642_fe0f",
    "name": "man bowing: medium skin tone"
}, {
    "code": "1f647_1f3fe_200d_2642_fe0f",
    "name": "man bowing: medium-dark skin tone"
}, {"code": "1f647_1f3ff_200d_2642_fe0f", "name": "man bowing: dark skin tone"}, {
    "code": "1f647_200d_2640_fe0f",
    "name": "woman bowing"
}, {
    "code": "1f647_1f3fb_200d_2640_fe0f",
    "name": "woman bowing: light skin tone"
}, {
    "code": "1f647_1f3fc_200d_2640_fe0f",
    "name": "woman bowing: medium-light skin tone"
}, {
    "code": "1f647_1f3fd_200d_2640_fe0f",
    "name": "woman bowing: medium skin tone"
}, {
    "code": "1f647_1f3fe_200d_2640_fe0f",
    "name": "woman bowing: medium-dark skin tone"
}, {"code": "1f647_1f3ff_200d_2640_fe0f", "name": "woman bowing: dark skin tone"}, {
    "code": "1f926",
    "name": "person facepalming"
}, {"code": "1f926_1f3fb", "name": "person facepalming: light skin tone"}, {
    "code": "1f926_1f3fc",
    "name": "person facepalming: medium-light skin tone"
}, {"code": "1f926_1f3fd", "name": "person facepalming: medium skin tone"}, {
    "code": "1f926_1f3fe",
    "name": "person facepalming: medium-dark skin tone"
}, {"code": "1f926_1f3ff", "name": "person facepalming: dark skin tone"}, {
    "code": "1f926_200d_2642_fe0f",
    "name": "man facepalming"
}, {
    "code": "1f926_1f3fb_200d_2642_fe0f",
    "name": "man facepalming: light skin tone"
}, {
    "code": "1f926_1f3fc_200d_2642_fe0f",
    "name": "man facepalming: medium-light skin tone"
}, {
    "code": "1f926_1f3fd_200d_2642_fe0f",
    "name": "man facepalming: medium skin tone"
}, {
    "code": "1f926_1f3fe_200d_2642_fe0f",
    "name": "man facepalming: medium-dark skin tone"
}, {"code": "1f926_1f3ff_200d_2642_fe0f", "name": "man facepalming: dark skin tone"}, {
    "code": "1f926_200d_2640_fe0f",
    "name": "woman facepalming"
}, {
    "code": "1f926_1f3fb_200d_2640_fe0f",
    "name": "woman facepalming: light skin tone"
}, {
    "code": "1f926_1f3fc_200d_2640_fe0f",
    "name": "woman facepalming: medium-light skin tone"
}, {
    "code": "1f926_1f3fd_200d_2640_fe0f",
    "name": "woman facepalming: medium skin tone"
}, {
    "code": "1f926_1f3fe_200d_2640_fe0f",
    "name": "woman facepalming: medium-dark skin tone"
}, {"code": "1f926_1f3ff_200d_2640_fe0f", "name": "woman facepalming: dark skin tone"}, {
    "code": "1f937",
    "name": "person shrugging"
}, {"code": "1f937_1f3fb", "name": "person shrugging: light skin tone"}, {
    "code": "1f937_1f3fc",
    "name": "person shrugging: medium-light skin tone"
}, {"code": "1f937_1f3fd", "name": "person shrugging: medium skin tone"}, {
    "code": "1f937_1f3fe",
    "name": "person shrugging: medium-dark skin tone"
}, {"code": "1f937_1f3ff", "name": "person shrugging: dark skin tone"}, {
    "code": "1f937_200d_2642_fe0f",
    "name": "man shrugging"
}, {
    "code": "1f937_1f3fb_200d_2642_fe0f",
    "name": "man shrugging: light skin tone"
}, {
    "code": "1f937_1f3fc_200d_2642_fe0f",
    "name": "man shrugging: medium-light skin tone"
}, {
    "code": "1f937_1f3fd_200d_2642_fe0f",
    "name": "man shrugging: medium skin tone"
}, {
    "code": "1f937_1f3fe_200d_2642_fe0f",
    "name": "man shrugging: medium-dark skin tone"
}, {"code": "1f937_1f3ff_200d_2642_fe0f", "name": "man shrugging: dark skin tone"}, {
    "code": "1f937_200d_2640_fe0f",
    "name": "woman shrugging"
}, {
    "code": "1f937_1f3fb_200d_2640_fe0f",
    "name": "woman shrugging: light skin tone"
}, {
    "code": "1f937_1f3fc_200d_2640_fe0f",
    "name": "woman shrugging: medium-light skin tone"
}, {
    "code": "1f937_1f3fd_200d_2640_fe0f",
    "name": "woman shrugging: medium skin tone"
}, {
    "code": "1f937_1f3fe_200d_2640_fe0f",
    "name": "woman shrugging: medium-dark skin tone"
}, {"code": "1f937_1f3ff_200d_2640_fe0f", "name": "woman shrugging: dark skin tone"}, {
    "code": "1f486",
    "name": "person getting massage"
}, {"code": "1f486_1f3fb", "name": "person getting massage: light skin tone"}, {
    "code": "1f486_1f3fc",
    "name": "person getting massage: medium-light skin tone"
}, {"code": "1f486_1f3fd", "name": "person getting massage: medium skin tone"}, {
    "code": "1f486_1f3fe",
    "name": "person getting massage: medium-dark skin tone"
}, {"code": "1f486_1f3ff", "name": "person getting massage: dark skin tone"}, {
    "code": "1f486_200d_2642_fe0f",
    "name": "man getting massage"
}, {
    "code": "1f486_1f3fb_200d_2642_fe0f",
    "name": "man getting massage: light skin tone"
}, {
    "code": "1f486_1f3fc_200d_2642_fe0f",
    "name": "man getting massage: medium-light skin tone"
}, {
    "code": "1f486_1f3fd_200d_2642_fe0f",
    "name": "man getting massage: medium skin tone"
}, {
    "code": "1f486_1f3fe_200d_2642_fe0f",
    "name": "man getting massage: medium-dark skin tone"
}, {
    "code": "1f486_1f3ff_200d_2642_fe0f",
    "name": "man getting massage: dark skin tone"
}, {"code": "1f486_200d_2640_fe0f", "name": "woman getting massage"}, {
    "code": "1f486_1f3fb_200d_2640_fe0f",
    "name": "woman getting massage: light skin tone"
}, {
    "code": "1f486_1f3fc_200d_2640_fe0f",
    "name": "woman getting massage: medium-light skin tone"
}, {
    "code": "1f486_1f3fd_200d_2640_fe0f",
    "name": "woman getting massage: medium skin tone"
}, {
    "code": "1f486_1f3fe_200d_2640_fe0f",
    "name": "woman getting massage: medium-dark skin tone"
}, {"code": "1f486_1f3ff_200d_2640_fe0f", "name": "woman getting massage: dark skin tone"}, {
    "code": "1f487",
    "name": "person getting haircut"
}, {"code": "1f487_1f3fb", "name": "person getting haircut: light skin tone"}, {
    "code": "1f487_1f3fc",
    "name": "person getting haircut: medium-light skin tone"
}, {"code": "1f487_1f3fd", "name": "person getting haircut: medium skin tone"}, {
    "code": "1f487_1f3fe",
    "name": "person getting haircut: medium-dark skin tone"
}, {"code": "1f487_1f3ff", "name": "person getting haircut: dark skin tone"}, {
    "code": "1f487_200d_2642_fe0f",
    "name": "man getting haircut"
}, {
    "code": "1f487_1f3fb_200d_2642_fe0f",
    "name": "man getting haircut: light skin tone"
}, {
    "code": "1f487_1f3fc_200d_2642_fe0f",
    "name": "man getting haircut: medium-light skin tone"
}, {
    "code": "1f487_1f3fd_200d_2642_fe0f",
    "name": "man getting haircut: medium skin tone"
}, {
    "code": "1f487_1f3fe_200d_2642_fe0f",
    "name": "man getting haircut: medium-dark skin tone"
}, {
    "code": "1f487_1f3ff_200d_2642_fe0f",
    "name": "man getting haircut: dark skin tone"
}, {"code": "1f487_200d_2640_fe0f", "name": "woman getting haircut"}, {
    "code": "1f487_1f3fb_200d_2640_fe0f",
    "name": "woman getting haircut: light skin tone"
}, {
    "code": "1f487_1f3fc_200d_2640_fe0f",
    "name": "woman getting haircut: medium-light skin tone"
}, {
    "code": "1f487_1f3fd_200d_2640_fe0f",
    "name": "woman getting haircut: medium skin tone"
}, {
    "code": "1f487_1f3fe_200d_2640_fe0f",
    "name": "woman getting haircut: medium-dark skin tone"
}, {"code": "1f487_1f3ff_200d_2640_fe0f", "name": "woman getting haircut: dark skin tone"}, {
    "code": "1f6b6",
    "name": "person walking"
}, {"code": "1f6b6_1f3fb", "name": "person walking: light skin tone"}, {
    "code": "1f6b6_1f3fc",
    "name": "person walking: medium-light skin tone"
}, {"code": "1f6b6_1f3fd", "name": "person walking: medium skin tone"}, {
    "code": "1f6b6_1f3fe",
    "name": "person walking: medium-dark skin tone"
}, {"code": "1f6b6_1f3ff", "name": "person walking: dark skin tone"}, {
    "code": "1f6b6_200d_2642_fe0f",
    "name": "man walking"
}, {
    "code": "1f6b6_1f3fb_200d_2642_fe0f",
    "name": "man walking: light skin tone"
}, {
    "code": "1f6b6_1f3fc_200d_2642_fe0f",
    "name": "man walking: medium-light skin tone"
}, {
    "code": "1f6b6_1f3fd_200d_2642_fe0f",
    "name": "man walking: medium skin tone"
}, {
    "code": "1f6b6_1f3fe_200d_2642_fe0f",
    "name": "man walking: medium-dark skin tone"
}, {"code": "1f6b6_1f3ff_200d_2642_fe0f", "name": "man walking: dark skin tone"}, {
    "code": "1f6b6_200d_2640_fe0f",
    "name": "woman walking"
}, {
    "code": "1f6b6_1f3fb_200d_2640_fe0f",
    "name": "woman walking: light skin tone"
}, {
    "code": "1f6b6_1f3fc_200d_2640_fe0f",
    "name": "woman walking: medium-light skin tone"
}, {
    "code": "1f6b6_1f3fd_200d_2640_fe0f",
    "name": "woman walking: medium skin tone"
}, {
    "code": "1f6b6_1f3fe_200d_2640_fe0f",
    "name": "woman walking: medium-dark skin tone"
}, {"code": "1f6b6_1f3ff_200d_2640_fe0f", "name": "woman walking: dark skin tone"}, {
    "code": "1f3c3",
    "name": "person running"
}, {"code": "1f3c3_1f3fb", "name": "person running: light skin tone"}, {
    "code": "1f3c3_1f3fc",
    "name": "person running: medium-light skin tone"
}, {"code": "1f3c3_1f3fd", "name": "person running: medium skin tone"}, {
    "code": "1f3c3_1f3fe",
    "name": "person running: medium-dark skin tone"
}, {"code": "1f3c3_1f3ff", "name": "person running: dark skin tone"}, {
    "code": "1f3c3_200d_2642_fe0f",
    "name": "man running"
}, {
    "code": "1f3c3_1f3fb_200d_2642_fe0f",
    "name": "man running: light skin tone"
}, {
    "code": "1f3c3_1f3fc_200d_2642_fe0f",
    "name": "man running: medium-light skin tone"
}, {
    "code": "1f3c3_1f3fd_200d_2642_fe0f",
    "name": "man running: medium skin tone"
}, {
    "code": "1f3c3_1f3fe_200d_2642_fe0f",
    "name": "man running: medium-dark skin tone"
}, {"code": "1f3c3_1f3ff_200d_2642_fe0f", "name": "man running: dark skin tone"}, {
    "code": "1f3c3_200d_2640_fe0f",
    "name": "woman running"
}, {
    "code": "1f3c3_1f3fb_200d_2640_fe0f",
    "name": "woman running: light skin tone"
}, {
    "code": "1f3c3_1f3fc_200d_2640_fe0f",
    "name": "woman running: medium-light skin tone"
}, {
    "code": "1f3c3_1f3fd_200d_2640_fe0f",
    "name": "woman running: medium skin tone"
}, {
    "code": "1f3c3_1f3fe_200d_2640_fe0f",
    "name": "woman running: medium-dark skin tone"
}, {"code": "1f3c3_1f3ff_200d_2640_fe0f", "name": "woman running: dark skin tone"}, {
    "code": "1f483",
    "name": "woman dancing"
}, {"code": "1f483_1f3fb", "name": "woman dancing: light skin tone"}, {
    "code": "1f483_1f3fc",
    "name": "woman dancing: medium-light skin tone"
}, {"code": "1f483_1f3fd", "name": "woman dancing: medium skin tone"}, {
    "code": "1f483_1f3fe",
    "name": "woman dancing: medium-dark skin tone"
}, {"code": "1f483_1f3ff", "name": "woman dancing: dark skin tone"}, {
    "code": "1f57a",
    "name": "man dancing"
}, {"code": "1f57a_1f3fb", "name": "man dancing: light skin tone"}, {
    "code": "1f57a_1f3fc",
    "name": "man dancing: medium-light skin tone"
}, {"code": "1f57a_1f3fd", "name": "man dancing: medium skin tone"}, {
    "code": "1f57a_1f3fe",
    "name": "man dancing: medium-dark skin tone"
}, {"code": "1f57a_1f3ff", "name": "man dancing: dark skin tone"}, {
    "code": "1f46f",
    "name": "people with bunny ears partying"
}, {"code": "1f46f_200d_2642_fe0f", "name": "men with bunny ears partying"}, {
    "code": "1f46f_200d_2640_fe0f",
    "name": "women with bunny ears partying"
}, {"code": "1f574", "name": "man in business suit levitating"}, {
    "code": "1f574_1f3fb",
    "name": "man in business suit levitating: light skin tone"
}, {"code": "1f574_1f3fc", "name": "man in business suit levitating: medium-light skin tone"}, {
    "code": "1f574_1f3fd",
    "name": "man in business suit levitating: medium skin tone"
}, {"code": "1f574_1f3fe", "name": "man in business suit levitating: medium-dark skin tone"}, {
    "code": "1f574_1f3ff",
    "name": "man in business suit levitating: dark skin tone"
}, {"code": "1f5e3", "name": "speaking head"}, {"code": "1f464", "name": "bust in silhouette"}, {
    "code": "1f465",
    "name": "busts in silhouette"
}, {"code": "1f93a", "name": "person fencing"}, {"code": "1f3c7", "name": "horse racing"}, {
    "code": "1f3c7_1f3fb",
    "name": "horse racing: light skin tone"
}, {"code": "1f3c7_1f3fc", "name": "horse racing: medium-light skin tone"}, {
    "code": "1f3c7_1f3fd",
    "name": "horse racing: medium skin tone"
}, {"code": "1f3c7_1f3fe", "name": "horse racing: medium-dark skin tone"}, {
    "code": "1f3c7_1f3ff",
    "name": "horse racing: dark skin tone"
}, {"code": "26f7", "name": "skier"}, {"code": "1f3c2", "name": "snowboarder"}, {
    "code": "1f3c2_1f3fb",
    "name": "snowboarder: light skin tone"
}, {"code": "1f3c2_1f3fc", "name": "snowboarder: medium-light skin tone"}, {
    "code": "1f3c2_1f3fd",
    "name": "snowboarder: medium skin tone"
}, {"code": "1f3c2_1f3fe", "name": "snowboarder: medium-dark skin tone"}, {
    "code": "1f3c2_1f3ff",
    "name": "snowboarder: dark skin tone"
}, {"code": "1f3cc", "name": "person golfing"}, {
    "code": "1f3cc_1f3fb",
    "name": "person golfing: light skin tone"
}, {"code": "1f3cc_1f3fc", "name": "person golfing: medium-light skin tone"}, {
    "code": "1f3cc_1f3fd",
    "name": "person golfing: medium skin tone"
}, {"code": "1f3cc_1f3fe", "name": "person golfing: medium-dark skin tone"}, {
    "code": "1f3cc_1f3ff",
    "name": "person golfing: dark skin tone"
}, {"code": "1f3cc_fe0f_200d_2642_fe0f", "name": "man golfing"}, {
    "code": "1f3cc_1f3fb_200d_2642_fe0f",
    "name": "man golfing: light skin tone"
}, {
    "code": "1f3cc_1f3fc_200d_2642_fe0f",
    "name": "man golfing: medium-light skin tone"
}, {
    "code": "1f3cc_1f3fd_200d_2642_fe0f",
    "name": "man golfing: medium skin tone"
}, {
    "code": "1f3cc_1f3fe_200d_2642_fe0f",
    "name": "man golfing: medium-dark skin tone"
}, {"code": "1f3cc_1f3ff_200d_2642_fe0f", "name": "man golfing: dark skin tone"}, {
    "code": "1f3cc_fe0f_200d_2640_fe0f",
    "name": "woman golfing"
}, {
    "code": "1f3cc_1f3fb_200d_2640_fe0f",
    "name": "woman golfing: light skin tone"
}, {
    "code": "1f3cc_1f3fc_200d_2640_fe0f",
    "name": "woman golfing: medium-light skin tone"
}, {
    "code": "1f3cc_1f3fd_200d_2640_fe0f",
    "name": "woman golfing: medium skin tone"
}, {
    "code": "1f3cc_1f3fe_200d_2640_fe0f",
    "name": "woman golfing: medium-dark skin tone"
}, {"code": "1f3cc_1f3ff_200d_2640_fe0f", "name": "woman golfing: dark skin tone"}, {
    "code": "1f3c4",
    "name": "person surfing"
}, {"code": "1f3c4_1f3fb", "name": "person surfing: light skin tone"}, {
    "code": "1f3c4_1f3fc",
    "name": "person surfing: medium-light skin tone"
}, {"code": "1f3c4_1f3fd", "name": "person surfing: medium skin tone"}, {
    "code": "1f3c4_1f3fe",
    "name": "person surfing: medium-dark skin tone"
}, {"code": "1f3c4_1f3ff", "name": "person surfing: dark skin tone"}, {
    "code": "1f3c4_200d_2642_fe0f",
    "name": "man surfing"
}, {
    "code": "1f3c4_1f3fb_200d_2642_fe0f",
    "name": "man surfing: light skin tone"
}, {
    "code": "1f3c4_1f3fc_200d_2642_fe0f",
    "name": "man surfing: medium-light skin tone"
}, {
    "code": "1f3c4_1f3fd_200d_2642_fe0f",
    "name": "man surfing: medium skin tone"
}, {
    "code": "1f3c4_1f3fe_200d_2642_fe0f",
    "name": "man surfing: medium-dark skin tone"
}, {"code": "1f3c4_1f3ff_200d_2642_fe0f", "name": "man surfing: dark skin tone"}, {
    "code": "1f3c4_200d_2640_fe0f",
    "name": "woman surfing"
}, {
    "code": "1f3c4_1f3fb_200d_2640_fe0f",
    "name": "woman surfing: light skin tone"
}, {
    "code": "1f3c4_1f3fc_200d_2640_fe0f",
    "name": "woman surfing: medium-light skin tone"
}, {
    "code": "1f3c4_1f3fd_200d_2640_fe0f",
    "name": "woman surfing: medium skin tone"
}, {
    "code": "1f3c4_1f3fe_200d_2640_fe0f",
    "name": "woman surfing: medium-dark skin tone"
}, {"code": "1f3c4_1f3ff_200d_2640_fe0f", "name": "woman surfing: dark skin tone"}, {
    "code": "1f6a3",
    "name": "person rowing boat"
}, {"code": "1f6a3_1f3fb", "name": "person rowing boat: light skin tone"}, {
    "code": "1f6a3_1f3fc",
    "name": "person rowing boat: medium-light skin tone"
}, {"code": "1f6a3_1f3fd", "name": "person rowing boat: medium skin tone"}, {
    "code": "1f6a3_1f3fe",
    "name": "person rowing boat: medium-dark skin tone"
}, {"code": "1f6a3_1f3ff", "name": "person rowing boat: dark skin tone"}, {
    "code": "1f6a3_200d_2642_fe0f",
    "name": "man rowing boat"
}, {
    "code": "1f6a3_1f3fb_200d_2642_fe0f",
    "name": "man rowing boat: light skin tone"
}, {
    "code": "1f6a3_1f3fc_200d_2642_fe0f",
    "name": "man rowing boat: medium-light skin tone"
}, {
    "code": "1f6a3_1f3fd_200d_2642_fe0f",
    "name": "man rowing boat: medium skin tone"
}, {
    "code": "1f6a3_1f3fe_200d_2642_fe0f",
    "name": "man rowing boat: medium-dark skin tone"
}, {"code": "1f6a3_1f3ff_200d_2642_fe0f", "name": "man rowing boat: dark skin tone"}, {
    "code": "1f6a3_200d_2640_fe0f",
    "name": "woman rowing boat"
}, {
    "code": "1f6a3_1f3fb_200d_2640_fe0f",
    "name": "woman rowing boat: light skin tone"
}, {
    "code": "1f6a3_1f3fc_200d_2640_fe0f",
    "name": "woman rowing boat: medium-light skin tone"
}, {
    "code": "1f6a3_1f3fd_200d_2640_fe0f",
    "name": "woman rowing boat: medium skin tone"
}, {
    "code": "1f6a3_1f3fe_200d_2640_fe0f",
    "name": "woman rowing boat: medium-dark skin tone"
}, {"code": "1f6a3_1f3ff_200d_2640_fe0f", "name": "woman rowing boat: dark skin tone"}, {
    "code": "1f3ca",
    "name": "person swimming"
}, {"code": "1f3ca_1f3fb", "name": "person swimming: light skin tone"}, {
    "code": "1f3ca_1f3fc",
    "name": "person swimming: medium-light skin tone"
}, {"code": "1f3ca_1f3fd", "name": "person swimming: medium skin tone"}, {
    "code": "1f3ca_1f3fe",
    "name": "person swimming: medium-dark skin tone"
}, {"code": "1f3ca_1f3ff", "name": "person swimming: dark skin tone"}, {
    "code": "1f3ca_200d_2642_fe0f",
    "name": "man swimming"
}, {
    "code": "1f3ca_1f3fb_200d_2642_fe0f",
    "name": "man swimming: light skin tone"
}, {
    "code": "1f3ca_1f3fc_200d_2642_fe0f",
    "name": "man swimming: medium-light skin tone"
}, {
    "code": "1f3ca_1f3fd_200d_2642_fe0f",
    "name": "man swimming: medium skin tone"
}, {
    "code": "1f3ca_1f3fe_200d_2642_fe0f",
    "name": "man swimming: medium-dark skin tone"
}, {"code": "1f3ca_1f3ff_200d_2642_fe0f", "name": "man swimming: dark skin tone"}, {
    "code": "1f3ca_200d_2640_fe0f",
    "name": "woman swimming"
}, {
    "code": "1f3ca_1f3fb_200d_2640_fe0f",
    "name": "woman swimming: light skin tone"
}, {
    "code": "1f3ca_1f3fc_200d_2640_fe0f",
    "name": "woman swimming: medium-light skin tone"
}, {
    "code": "1f3ca_1f3fd_200d_2640_fe0f",
    "name": "woman swimming: medium skin tone"
}, {
    "code": "1f3ca_1f3fe_200d_2640_fe0f",
    "name": "woman swimming: medium-dark skin tone"
}, {"code": "1f3ca_1f3ff_200d_2640_fe0f", "name": "woman swimming: dark skin tone"}, {
    "code": "26f9",
    "name": "person bouncing ball"
}, {"code": "26f9_1f3fb", "name": "person bouncing ball: light skin tone"}, {
    "code": "26f9_1f3fc",
    "name": "person bouncing ball: medium-light skin tone"
}, {"code": "26f9_1f3fd", "name": "person bouncing ball: medium skin tone"}, {
    "code": "26f9_1f3fe",
    "name": "person bouncing ball: medium-dark skin tone"
}, {"code": "26f9_1f3ff", "name": "person bouncing ball: dark skin tone"}, {
    "code": "26f9_fe0f_200d_2642_fe0f",
    "name": "man bouncing ball"
}, {
    "code": "26f9_1f3fb_200d_2642_fe0f",
    "name": "man bouncing ball: light skin tone"
}, {
    "code": "26f9_1f3fc_200d_2642_fe0f",
    "name": "man bouncing ball: medium-light skin tone"
}, {
    "code": "26f9_1f3fd_200d_2642_fe0f",
    "name": "man bouncing ball: medium skin tone"
}, {
    "code": "26f9_1f3fe_200d_2642_fe0f",
    "name": "man bouncing ball: medium-dark skin tone"
}, {
    "code": "26f9_1f3ff_200d_2642_fe0f",
    "name": "man bouncing ball: dark skin tone"
}, {"code": "26f9_fe0f_200d_2640_fe0f", "name": "woman bouncing ball"}, {
    "code": "26f9_1f3fb_200d_2640_fe0f",
    "name": "woman bouncing ball: light skin tone"
}, {
    "code": "26f9_1f3fc_200d_2640_fe0f",
    "name": "woman bouncing ball: medium-light skin tone"
}, {
    "code": "26f9_1f3fd_200d_2640_fe0f",
    "name": "woman bouncing ball: medium skin tone"
}, {
    "code": "26f9_1f3fe_200d_2640_fe0f",
    "name": "woman bouncing ball: medium-dark skin tone"
}, {"code": "26f9_1f3ff_200d_2640_fe0f", "name": "woman bouncing ball: dark skin tone"}, {
    "code": "1f3cb",
    "name": "person lifting weights"
}, {"code": "1f3cb_1f3fb", "name": "person lifting weights: light skin tone"}, {
    "code": "1f3cb_1f3fc",
    "name": "person lifting weights: medium-light skin tone"
}, {"code": "1f3cb_1f3fd", "name": "person lifting weights: medium skin tone"}, {
    "code": "1f3cb_1f3fe",
    "name": "person lifting weights: medium-dark skin tone"
}, {"code": "1f3cb_1f3ff", "name": "person lifting weights: dark skin tone"}, {
    "code": "1f3cb_fe0f_200d_2642_fe0f",
    "name": "man lifting weights"
}, {
    "code": "1f3cb_1f3fb_200d_2642_fe0f",
    "name": "man lifting weights: light skin tone"
}, {
    "code": "1f3cb_1f3fc_200d_2642_fe0f",
    "name": "man lifting weights: medium-light skin tone"
}, {
    "code": "1f3cb_1f3fd_200d_2642_fe0f",
    "name": "man lifting weights: medium skin tone"
}, {
    "code": "1f3cb_1f3fe_200d_2642_fe0f",
    "name": "man lifting weights: medium-dark skin tone"
}, {
    "code": "1f3cb_1f3ff_200d_2642_fe0f",
    "name": "man lifting weights: dark skin tone"
}, {"code": "1f3cb_fe0f_200d_2640_fe0f", "name": "woman lifting weights"}, {
    "code": "1f3cb_1f3fb_200d_2640_fe0f",
    "name": "woman lifting weights: light skin tone"
}, {
    "code": "1f3cb_1f3fc_200d_2640_fe0f",
    "name": "woman lifting weights: medium-light skin tone"
}, {
    "code": "1f3cb_1f3fd_200d_2640_fe0f",
    "name": "woman lifting weights: medium skin tone"
}, {
    "code": "1f3cb_1f3fe_200d_2640_fe0f",
    "name": "woman lifting weights: medium-dark skin tone"
}, {"code": "1f3cb_1f3ff_200d_2640_fe0f", "name": "woman lifting weights: dark skin tone"}, {
    "code": "1f6b4",
    "name": "person biking"
}, {"code": "1f6b4_1f3fb", "name": "person biking: light skin tone"}, {
    "code": "1f6b4_1f3fc",
    "name": "person biking: medium-light skin tone"
}, {"code": "1f6b4_1f3fd", "name": "person biking: medium skin tone"}, {
    "code": "1f6b4_1f3fe",
    "name": "person biking: medium-dark skin tone"
}, {"code": "1f6b4_1f3ff", "name": "person biking: dark skin tone"}, {
    "code": "1f6b4_200d_2642_fe0f",
    "name": "man biking"
}, {"code": "1f6b4_1f3fb_200d_2642_fe0f", "name": "man biking: light skin tone"}, {
    "code": "1f6b4_1f3fc_200d_2642_fe0f",
    "name": "man biking: medium-light skin tone"
}, {
    "code": "1f6b4_1f3fd_200d_2642_fe0f",
    "name": "man biking: medium skin tone"
}, {
    "code": "1f6b4_1f3fe_200d_2642_fe0f",
    "name": "man biking: medium-dark skin tone"
}, {"code": "1f6b4_1f3ff_200d_2642_fe0f", "name": "man biking: dark skin tone"}, {
    "code": "1f6b4_200d_2640_fe0f",
    "name": "woman biking"
}, {
    "code": "1f6b4_1f3fb_200d_2640_fe0f",
    "name": "woman biking: light skin tone"
}, {
    "code": "1f6b4_1f3fc_200d_2640_fe0f",
    "name": "woman biking: medium-light skin tone"
}, {
    "code": "1f6b4_1f3fd_200d_2640_fe0f",
    "name": "woman biking: medium skin tone"
}, {
    "code": "1f6b4_1f3fe_200d_2640_fe0f",
    "name": "woman biking: medium-dark skin tone"
}, {"code": "1f6b4_1f3ff_200d_2640_fe0f", "name": "woman biking: dark skin tone"}, {
    "code": "1f6b5",
    "name": "person mountain biking"
}, {"code": "1f6b5_1f3fb", "name": "person mountain biking: light skin tone"}, {
    "code": "1f6b5_1f3fc",
    "name": "person mountain biking: medium-light skin tone"
}, {"code": "1f6b5_1f3fd", "name": "person mountain biking: medium skin tone"}, {
    "code": "1f6b5_1f3fe",
    "name": "person mountain biking: medium-dark skin tone"
}, {"code": "1f6b5_1f3ff", "name": "person mountain biking: dark skin tone"}, {
    "code": "1f6b5_200d_2642_fe0f",
    "name": "man mountain biking"
}, {
    "code": "1f6b5_1f3fb_200d_2642_fe0f",
    "name": "man mountain biking: light skin tone"
}, {
    "code": "1f6b5_1f3fc_200d_2642_fe0f",
    "name": "man mountain biking: medium-light skin tone"
}, {
    "code": "1f6b5_1f3fd_200d_2642_fe0f",
    "name": "man mountain biking: medium skin tone"
}, {
    "code": "1f6b5_1f3fe_200d_2642_fe0f",
    "name": "man mountain biking: medium-dark skin tone"
}, {
    "code": "1f6b5_1f3ff_200d_2642_fe0f",
    "name": "man mountain biking: dark skin tone"
}, {"code": "1f6b5_200d_2640_fe0f", "name": "woman mountain biking"}, {
    "code": "1f6b5_1f3fb_200d_2640_fe0f",
    "name": "woman mountain biking: light skin tone"
}, {
    "code": "1f6b5_1f3fc_200d_2640_fe0f",
    "name": "woman mountain biking: medium-light skin tone"
}, {
    "code": "1f6b5_1f3fd_200d_2640_fe0f",
    "name": "woman mountain biking: medium skin tone"
}, {
    "code": "1f6b5_1f3fe_200d_2640_fe0f",
    "name": "woman mountain biking: medium-dark skin tone"
}, {"code": "1f6b5_1f3ff_200d_2640_fe0f", "name": "woman mountain biking: dark skin tone"}, {
    "code": "1f3ce",
    "name": "racing car"
}, {"code": "1f3cd", "name": "motorcycle"}, {"code": "1f938", "name": "person cartwheeling"}, {
    "code": "1f938_1f3fb",
    "name": "person cartwheeling: light skin tone"
}, {"code": "1f938_1f3fc", "name": "person cartwheeling: medium-light skin tone"}, {
    "code": "1f938_1f3fd",
    "name": "person cartwheeling: medium skin tone"
}, {"code": "1f938_1f3fe", "name": "person cartwheeling: medium-dark skin tone"}, {
    "code": "1f938_1f3ff",
    "name": "person cartwheeling: dark skin tone"
}, {"code": "1f938_200d_2642_fe0f", "name": "man cartwheeling"}, {
    "code": "1f938_1f3fb_200d_2642_fe0f",
    "name": "man cartwheeling: light skin tone"
}, {
    "code": "1f938_1f3fc_200d_2642_fe0f",
    "name": "man cartwheeling: medium-light skin tone"
}, {
    "code": "1f938_1f3fd_200d_2642_fe0f",
    "name": "man cartwheeling: medium skin tone"
}, {
    "code": "1f938_1f3fe_200d_2642_fe0f",
    "name": "man cartwheeling: medium-dark skin tone"
}, {"code": "1f938_1f3ff_200d_2642_fe0f", "name": "man cartwheeling: dark skin tone"}, {
    "code": "1f938_200d_2640_fe0f",
    "name": "woman cartwheeling"
}, {
    "code": "1f938_1f3fb_200d_2640_fe0f",
    "name": "woman cartwheeling: light skin tone"
}, {
    "code": "1f938_1f3fc_200d_2640_fe0f",
    "name": "woman cartwheeling: medium-light skin tone"
}, {
    "code": "1f938_1f3fd_200d_2640_fe0f",
    "name": "woman cartwheeling: medium skin tone"
}, {
    "code": "1f938_1f3fe_200d_2640_fe0f",
    "name": "woman cartwheeling: medium-dark skin tone"
}, {"code": "1f938_1f3ff_200d_2640_fe0f", "name": "woman cartwheeling: dark skin tone"}, {
    "code": "1f93c",
    "name": "people wrestling"
}, {"code": "1f93c_200d_2642_fe0f", "name": "men wrestling"}, {
    "code": "1f93c_200d_2640_fe0f",
    "name": "women wrestling"
}, {"code": "1f93d", "name": "person playing water polo"}, {
    "code": "1f93d_1f3fb",
    "name": "person playing water polo: light skin tone"
}, {"code": "1f93d_1f3fc", "name": "person playing water polo: medium-light skin tone"}, {
    "code": "1f93d_1f3fd",
    "name": "person playing water polo: medium skin tone"
}, {"code": "1f93d_1f3fe", "name": "person playing water polo: medium-dark skin tone"}, {
    "code": "1f93d_1f3ff",
    "name": "person playing water polo: dark skin tone"
}, {"code": "1f93d_200d_2642_fe0f", "name": "man playing water polo"}, {
    "code": "1f93d_1f3fb_200d_2642_fe0f",
    "name": "man playing water polo: light skin tone"
}, {
    "code": "1f93d_1f3fc_200d_2642_fe0f",
    "name": "man playing water polo: medium-light skin tone"
}, {
    "code": "1f93d_1f3fd_200d_2642_fe0f",
    "name": "man playing water polo: medium skin tone"
}, {
    "code": "1f93d_1f3fe_200d_2642_fe0f",
    "name": "man playing water polo: medium-dark skin tone"
}, {
    "code": "1f93d_1f3ff_200d_2642_fe0f",
    "name": "man playing water polo: dark skin tone"
}, {"code": "1f93d_200d_2640_fe0f", "name": "woman playing water polo"}, {
    "code": "1f93d_1f3fb_200d_2640_fe0f",
    "name": "woman playing water polo: light skin tone"
}, {
    "code": "1f93d_1f3fc_200d_2640_fe0f",
    "name": "woman playing water polo: medium-light skin tone"
}, {
    "code": "1f93d_1f3fd_200d_2640_fe0f",
    "name": "woman playing water polo: medium skin tone"
}, {
    "code": "1f93d_1f3fe_200d_2640_fe0f",
    "name": "woman playing water polo: medium-dark skin tone"
}, {"code": "1f93d_1f3ff_200d_2640_fe0f", "name": "woman playing water polo: dark skin tone"}, {
    "code": "1f93e",
    "name": "person playing handball"
}, {"code": "1f93e_1f3fb", "name": "person playing handball: light skin tone"}, {
    "code": "1f93e_1f3fc",
    "name": "person playing handball: medium-light skin tone"
}, {"code": "1f93e_1f3fd", "name": "person playing handball: medium skin tone"}, {
    "code": "1f93e_1f3fe",
    "name": "person playing handball: medium-dark skin tone"
}, {"code": "1f93e_1f3ff", "name": "person playing handball: dark skin tone"}, {
    "code": "1f93e_200d_2642_fe0f",
    "name": "man playing handball"
}, {
    "code": "1f93e_1f3fb_200d_2642_fe0f",
    "name": "man playing handball: light skin tone"
}, {
    "code": "1f93e_1f3fc_200d_2642_fe0f",
    "name": "man playing handball: medium-light skin tone"
}, {
    "code": "1f93e_1f3fd_200d_2642_fe0f",
    "name": "man playing handball: medium skin tone"
}, {
    "code": "1f93e_1f3fe_200d_2642_fe0f",
    "name": "man playing handball: medium-dark skin tone"
}, {
    "code": "1f93e_1f3ff_200d_2642_fe0f",
    "name": "man playing handball: dark skin tone"
}, {"code": "1f93e_200d_2640_fe0f", "name": "woman playing handball"}, {
    "code": "1f93e_1f3fb_200d_2640_fe0f",
    "name": "woman playing handball: light skin tone"
}, {
    "code": "1f93e_1f3fc_200d_2640_fe0f",
    "name": "woman playing handball: medium-light skin tone"
}, {
    "code": "1f93e_1f3fd_200d_2640_fe0f",
    "name": "woman playing handball: medium skin tone"
}, {
    "code": "1f93e_1f3fe_200d_2640_fe0f",
    "name": "woman playing handball: medium-dark skin tone"
}, {"code": "1f93e_1f3ff_200d_2640_fe0f", "name": "woman playing handball: dark skin tone"}, {
    "code": "1f939",
    "name": "person juggling"
}, {"code": "1f939_1f3fb", "name": "person juggling: light skin tone"}, {
    "code": "1f939_1f3fc",
    "name": "person juggling: medium-light skin tone"
}, {"code": "1f939_1f3fd", "name": "person juggling: medium skin tone"}, {
    "code": "1f939_1f3fe",
    "name": "person juggling: medium-dark skin tone"
}, {"code": "1f939_1f3ff", "name": "person juggling: dark skin tone"}, {
    "code": "1f939_200d_2642_fe0f",
    "name": "man juggling"
}, {
    "code": "1f939_1f3fb_200d_2642_fe0f",
    "name": "man juggling: light skin tone"
}, {
    "code": "1f939_1f3fc_200d_2642_fe0f",
    "name": "man juggling: medium-light skin tone"
}, {
    "code": "1f939_1f3fd_200d_2642_fe0f",
    "name": "man juggling: medium skin tone"
}, {
    "code": "1f939_1f3fe_200d_2642_fe0f",
    "name": "man juggling: medium-dark skin tone"
}, {"code": "1f939_1f3ff_200d_2642_fe0f", "name": "man juggling: dark skin tone"}, {
    "code": "1f939_200d_2640_fe0f",
    "name": "woman juggling"
}, {
    "code": "1f939_1f3fb_200d_2640_fe0f",
    "name": "woman juggling: light skin tone"
}, {
    "code": "1f939_1f3fc_200d_2640_fe0f",
    "name": "woman juggling: medium-light skin tone"
}, {
    "code": "1f939_1f3fd_200d_2640_fe0f",
    "name": "woman juggling: medium skin tone"
}, {
    "code": "1f939_1f3fe_200d_2640_fe0f",
    "name": "woman juggling: medium-dark skin tone"
}, {"code": "1f939_1f3ff_200d_2640_fe0f", "name": "woman juggling: dark skin tone"}, {
    "code": "1f46b",
    "name": "man and woman holding hands"
}, {"code": "1f46c", "name": "two men holding hands"}, {
    "code": "1f46d",
    "name": "two women holding hands"
}, {"code": "1f48f", "name": "kiss"}, {
    "code": "1f469_200d_2764_fe0f_200d_1f48b_200d_1f468",
    "name": "kiss: woman, man"
}, {
    "code": "1f468_200d_2764_fe0f_200d_1f48b_200d_1f468",
    "name": "kiss: man, man"
}, {"code": "1f469_200d_2764_fe0f_200d_1f48b_200d_1f469", "name": "kiss: woman, woman"}, {
    "code": "1f491",
    "name": "couple with heart"
}, {
    "code": "1f469_200d_2764_fe0f_200d_1f468",
    "name": "couple with heart: woman, man"
}, {
    "code": "1f468_200d_2764_fe0f_200d_1f468",
    "name": "couple with heart: man, man"
}, {"code": "1f469_200d_2764_fe0f_200d_1f469", "name": "couple with heart: woman, woman"}, {
    "code": "1f46a",
    "name": "family"
}, {"code": "1f468_200d_1f469_200d_1f466", "name": "family: man, woman, boy"}, {
    "code": "1f468_200d_1f469_200d_1f467",
    "name": "family: man, woman, girl"
}, {
    "code": "1f468_200d_1f469_200d_1f467_200d_1f466",
    "name": "family: man, woman, girl, boy"
}, {
    "code": "1f468_200d_1f469_200d_1f466_200d_1f466",
    "name": "family: man, woman, boy, boy"
}, {
    "code": "1f468_200d_1f469_200d_1f467_200d_1f467",
    "name": "family: man, woman, girl, girl"
}, {"code": "1f468_200d_1f468_200d_1f466", "name": "family: man, man, boy"}, {
    "code": "1f468_200d_1f468_200d_1f467",
    "name": "family: man, man, girl"
}, {
    "code": "1f468_200d_1f468_200d_1f467_200d_1f466",
    "name": "family: man, man, girl, boy"
}, {
    "code": "1f468_200d_1f468_200d_1f466_200d_1f466",
    "name": "family: man, man, boy, boy"
}, {
    "code": "1f468_200d_1f468_200d_1f467_200d_1f467",
    "name": "family: man, man, girl, girl"
}, {"code": "1f469_200d_1f469_200d_1f466", "name": "family: woman, woman, boy"}, {
    "code": "1f469_200d_1f469_200d_1f467",
    "name": "family: woman, woman, girl"
}, {
    "code": "1f469_200d_1f469_200d_1f467_200d_1f466",
    "name": "family: woman, woman, girl, boy"
}, {
    "code": "1f469_200d_1f469_200d_1f466_200d_1f466",
    "name": "family: woman, woman, boy, boy"
}, {
    "code": "1f469_200d_1f469_200d_1f467_200d_1f467",
    "name": "family: woman, woman, girl, girl"
}, {"code": "1f468_200d_1f466", "name": "family: man, boy"}, {
    "code": "1f468_200d_1f466_200d_1f466",
    "name": "family: man, boy, boy"
}, {"code": "1f468_200d_1f467", "name": "family: man, girl"}, {
    "code": "1f468_200d_1f467_200d_1f466",
    "name": "family: man, girl, boy"
}, {"code": "1f468_200d_1f467_200d_1f467", "name": "family: man, girl, girl"}, {
    "code": "1f469_200d_1f466",
    "name": "family: woman, boy"
}, {"code": "1f469_200d_1f466_200d_1f466", "name": "family: woman, boy, boy"}, {
    "code": "1f469_200d_1f467",
    "name": "family: woman, girl"
}, {"code": "1f469_200d_1f467_200d_1f466", "name": "family: woman, girl, boy"}, {
    "code": "1f469_200d_1f467_200d_1f467",
    "name": "family: woman, girl, girl"
}, {"code": "1f3fb", "name": "light skin tone"}, {"code": "1f3fc", "name": "medium-light skin tone"}, {
    "code": "1f3fd",
    "name": "medium skin tone"
}, {"code": "1f3fe", "name": "medium-dark skin tone"}, {"code": "1f3ff", "name": "dark skin tone"}, {
    "code": "1f4aa",
    "name": "flexed biceps"
}, {"code": "1f4aa_1f3fb", "name": "flexed biceps: light skin tone"}, {
    "code": "1f4aa_1f3fc",
    "name": "flexed biceps: medium-light skin tone"
}, {"code": "1f4aa_1f3fd", "name": "flexed biceps: medium skin tone"}, {
    "code": "1f4aa_1f3fe",
    "name": "flexed biceps: medium-dark skin tone"
}, {"code": "1f4aa_1f3ff", "name": "flexed biceps: dark skin tone"}, {
    "code": "1f933",
    "name": "selfie"
}, {"code": "1f933_1f3fb", "name": "selfie: light skin tone"}, {
    "code": "1f933_1f3fc",
    "name": "selfie: medium-light skin tone"
}, {"code": "1f933_1f3fd", "name": "selfie: medium skin tone"}, {
    "code": "1f933_1f3fe",
    "name": "selfie: medium-dark skin tone"
}, {"code": "1f933_1f3ff", "name": "selfie: dark skin tone"}, {
    "code": "1f448",
    "name": "backhand index pointing left"
}, {"code": "1f448_1f3fb", "name": "backhand index pointing left: light skin tone"}, {
    "code": "1f448_1f3fc",
    "name": "backhand index pointing left: medium-light skin tone"
}, {"code": "1f448_1f3fd", "name": "backhand index pointing left: medium skin tone"}, {
    "code": "1f448_1f3fe",
    "name": "backhand index pointing left: medium-dark skin tone"
}, {"code": "1f448_1f3ff", "name": "backhand index pointing left: dark skin tone"}, {
    "code": "1f449",
    "name": "backhand index pointing right"
}, {"code": "1f449_1f3fb", "name": "backhand index pointing right: light skin tone"}, {
    "code": "1f449_1f3fc",
    "name": "backhand index pointing right: medium-light skin tone"
}, {"code": "1f449_1f3fd", "name": "backhand index pointing right: medium skin tone"}, {
    "code": "1f449_1f3fe",
    "name": "backhand index pointing right: medium-dark skin tone"
}, {"code": "1f449_1f3ff", "name": "backhand index pointing right: dark skin tone"}, {
    "code": "261d",
    "name": "index pointing up"
}, {"code": "261d_1f3fb", "name": "index pointing up: light skin tone"}, {
    "code": "261d_1f3fc",
    "name": "index pointing up: medium-light skin tone"
}, {"code": "261d_1f3fd", "name": "index pointing up: medium skin tone"}, {
    "code": "261d_1f3fe",
    "name": "index pointing up: medium-dark skin tone"
}, {"code": "261d_1f3ff", "name": "index pointing up: dark skin tone"}, {
    "code": "1f446",
    "name": "backhand index pointing up"
}, {"code": "1f446_1f3fb", "name": "backhand index pointing up: light skin tone"}, {
    "code": "1f446_1f3fc",
    "name": "backhand index pointing up: medium-light skin tone"
}, {"code": "1f446_1f3fd", "name": "backhand index pointing up: medium skin tone"}, {
    "code": "1f446_1f3fe",
    "name": "backhand index pointing up: medium-dark skin tone"
}, {"code": "1f446_1f3ff", "name": "backhand index pointing up: dark skin tone"}, {
    "code": "1f595",
    "name": "middle finger"
}, {"code": "1f595_1f3fb", "name": "middle finger: light skin tone"}, {
    "code": "1f595_1f3fc",
    "name": "middle finger: medium-light skin tone"
}, {"code": "1f595_1f3fd", "name": "middle finger: medium skin tone"}, {
    "code": "1f595_1f3fe",
    "name": "middle finger: medium-dark skin tone"
}, {"code": "1f595_1f3ff", "name": "middle finger: dark skin tone"}, {
    "code": "1f447",
    "name": "backhand index pointing down"
}, {"code": "1f447_1f3fb", "name": "backhand index pointing down: light skin tone"}, {
    "code": "1f447_1f3fc",
    "name": "backhand index pointing down: medium-light skin tone"
}, {"code": "1f447_1f3fd", "name": "backhand index pointing down: medium skin tone"}, {
    "code": "1f447_1f3fe",
    "name": "backhand index pointing down: medium-dark skin tone"
}, {"code": "1f447_1f3ff", "name": "backhand index pointing down: dark skin tone"}, {
    "code": "270c",
    "name": "victory hand"
}, {"code": "270c_1f3fb", "name": "victory hand: light skin tone"}, {
    "code": "270c_1f3fc",
    "name": "victory hand: medium-light skin tone"
}, {"code": "270c_1f3fd", "name": "victory hand: medium skin tone"}, {
    "code": "270c_1f3fe",
    "name": "victory hand: medium-dark skin tone"
}, {"code": "270c_1f3ff", "name": "victory hand: dark skin tone"}, {
    "code": "1f91e",
    "name": "crossed fingers"
}, {"code": "1f91e_1f3fb", "name": "crossed fingers: light skin tone"}, {
    "code": "1f91e_1f3fc",
    "name": "crossed fingers: medium-light skin tone"
}, {"code": "1f91e_1f3fd", "name": "crossed fingers: medium skin tone"}, {
    "code": "1f91e_1f3fe",
    "name": "crossed fingers: medium-dark skin tone"
}, {"code": "1f91e_1f3ff", "name": "crossed fingers: dark skin tone"}, {
    "code": "1f596",
    "name": "vulcan salute"
}, {"code": "1f596_1f3fb", "name": "vulcan salute: light skin tone"}, {
    "code": "1f596_1f3fc",
    "name": "vulcan salute: medium-light skin tone"
}, {"code": "1f596_1f3fd", "name": "vulcan salute: medium skin tone"}, {
    "code": "1f596_1f3fe",
    "name": "vulcan salute: medium-dark skin tone"
}, {"code": "1f596_1f3ff", "name": "vulcan salute: dark skin tone"}, {
    "code": "1f918",
    "name": "sign of the horns"
}, {"code": "1f918_1f3fb", "name": "sign of the horns: light skin tone"}, {
    "code": "1f918_1f3fc",
    "name": "sign of the horns: medium-light skin tone"
}, {"code": "1f918_1f3fd", "name": "sign of the horns: medium skin tone"}, {
    "code": "1f918_1f3fe",
    "name": "sign of the horns: medium-dark skin tone"
}, {"code": "1f918_1f3ff", "name": "sign of the horns: dark skin tone"}, {
    "code": "1f919",
    "name": "call me hand"
}, {"code": "1f919_1f3fb", "name": "call me hand: light skin tone"}, {
    "code": "1f919_1f3fc",
    "name": "call me hand: medium-light skin tone"
}, {"code": "1f919_1f3fd", "name": "call me hand: medium skin tone"}, {
    "code": "1f919_1f3fe",
    "name": "call me hand: medium-dark skin tone"
}, {"code": "1f919_1f3ff", "name": "call me hand: dark skin tone"}, {
    "code": "1f590",
    "name": "raised hand with fingers splayed"
}, {"code": "1f590_1f3fb", "name": "raised hand with fingers splayed: light skin tone"}, {
    "code": "1f590_1f3fc",
    "name": "raised hand with fingers splayed: medium-light skin tone"
}, {"code": "1f590_1f3fd", "name": "raised hand with fingers splayed: medium skin tone"}, {
    "code": "1f590_1f3fe",
    "name": "raised hand with fingers splayed: medium-dark skin tone"
}, {"code": "1f590_1f3ff", "name": "raised hand with fingers splayed: dark skin tone"}, {
    "code": "270b",
    "name": "raised hand"
}, {"code": "270b_1f3fb", "name": "raised hand: light skin tone"}, {
    "code": "270b_1f3fc",
    "name": "raised hand: medium-light skin tone"
}, {"code": "270b_1f3fd", "name": "raised hand: medium skin tone"}, {
    "code": "270b_1f3fe",
    "name": "raised hand: medium-dark skin tone"
}, {"code": "270b_1f3ff", "name": "raised hand: dark skin tone"}, {
    "code": "1f44c",
    "name": "OK hand"
}, {"code": "1f44c_1f3fb", "name": "OK hand: light skin tone"}, {
    "code": "1f44c_1f3fc",
    "name": "OK hand: medium-light skin tone"
}, {"code": "1f44c_1f3fd", "name": "OK hand: medium skin tone"}, {
    "code": "1f44c_1f3fe",
    "name": "OK hand: medium-dark skin tone"
}, {"code": "1f44c_1f3ff", "name": "OK hand: dark skin tone"}, {
    "code": "1f44d",
    "name": "thumbs up"
}, {"code": "1f44d_1f3fb", "name": "thumbs up: light skin tone"}, {
    "code": "1f44d_1f3fc",
    "name": "thumbs up: medium-light skin tone"
}, {"code": "1f44d_1f3fd", "name": "thumbs up: medium skin tone"}, {
    "code": "1f44d_1f3fe",
    "name": "thumbs up: medium-dark skin tone"
}, {"code": "1f44d_1f3ff", "name": "thumbs up: dark skin tone"}, {
    "code": "1f44e",
    "name": "thumbs down"
}, {"code": "1f44e_1f3fb", "name": "thumbs down: light skin tone"}, {
    "code": "1f44e_1f3fc",
    "name": "thumbs down: medium-light skin tone"
}, {"code": "1f44e_1f3fd", "name": "thumbs down: medium skin tone"}, {
    "code": "1f44e_1f3fe",
    "name": "thumbs down: medium-dark skin tone"
}, {"code": "1f44e_1f3ff", "name": "thumbs down: dark skin tone"}, {
    "code": "270a",
    "name": "raised fist"
}, {"code": "270a_1f3fb", "name": "raised fist: light skin tone"}, {
    "code": "270a_1f3fc",
    "name": "raised fist: medium-light skin tone"
}, {"code": "270a_1f3fd", "name": "raised fist: medium skin tone"}, {
    "code": "270a_1f3fe",
    "name": "raised fist: medium-dark skin tone"
}, {"code": "270a_1f3ff", "name": "raised fist: dark skin tone"}, {
    "code": "1f44a",
    "name": "oncoming fist"
}, {"code": "1f44a_1f3fb", "name": "oncoming fist: light skin tone"}, {
    "code": "1f44a_1f3fc",
    "name": "oncoming fist: medium-light skin tone"
}, {"code": "1f44a_1f3fd", "name": "oncoming fist: medium skin tone"}, {
    "code": "1f44a_1f3fe",
    "name": "oncoming fist: medium-dark skin tone"
}, {"code": "1f44a_1f3ff", "name": "oncoming fist: dark skin tone"}, {
    "code": "1f91b",
    "name": "left-facing fist"
}, {"code": "1f91b_1f3fb", "name": "left-facing fist: light skin tone"}, {
    "code": "1f91b_1f3fc",
    "name": "left-facing fist: medium-light skin tone"
}, {"code": "1f91b_1f3fd", "name": "left-facing fist: medium skin tone"}, {
    "code": "1f91b_1f3fe",
    "name": "left-facing fist: medium-dark skin tone"
}, {"code": "1f91b_1f3ff", "name": "left-facing fist: dark skin tone"}, {
    "code": "1f91c",
    "name": "right-facing fist"
}, {"code": "1f91c_1f3fb", "name": "right-facing fist: light skin tone"}, {
    "code": "1f91c_1f3fc",
    "name": "right-facing fist: medium-light skin tone"
}, {"code": "1f91c_1f3fd", "name": "right-facing fist: medium skin tone"}, {
    "code": "1f91c_1f3fe",
    "name": "right-facing fist: medium-dark skin tone"
}, {"code": "1f91c_1f3ff", "name": "right-facing fist: dark skin tone"}, {
    "code": "1f91a",
    "name": "raised back of hand"
}, {"code": "1f91a_1f3fb", "name": "raised back of hand: light skin tone"}, {
    "code": "1f91a_1f3fc",
    "name": "raised back of hand: medium-light skin tone"
}, {"code": "1f91a_1f3fd", "name": "raised back of hand: medium skin tone"}, {
    "code": "1f91a_1f3fe",
    "name": "raised back of hand: medium-dark skin tone"
}, {"code": "1f91a_1f3ff", "name": "raised back of hand: dark skin tone"}, {
    "code": "1f44b",
    "name": "waving hand"
}, {"code": "1f44b_1f3fb", "name": "waving hand: light skin tone"}, {
    "code": "1f44b_1f3fc",
    "name": "waving hand: medium-light skin tone"
}, {"code": "1f44b_1f3fd", "name": "waving hand: medium skin tone"}, {
    "code": "1f44b_1f3fe",
    "name": "waving hand: medium-dark skin tone"
}, {"code": "1f44b_1f3ff", "name": "waving hand: dark skin tone"}, {
    "code": "1f44f",
    "name": "clapping hands"
}, {"code": "1f44f_1f3fb", "name": "clapping hands: light skin tone"}, {
    "code": "1f44f_1f3fc",
    "name": "clapping hands: medium-light skin tone"
}, {"code": "1f44f_1f3fd", "name": "clapping hands: medium skin tone"}, {
    "code": "1f44f_1f3fe",
    "name": "clapping hands: medium-dark skin tone"
}, {"code": "1f44f_1f3ff", "name": "clapping hands: dark skin tone"}, {
    "code": "270d",
    "name": "writing hand"
}, {"code": "270d_1f3fb", "name": "writing hand: light skin tone"}, {
    "code": "270d_1f3fc",
    "name": "writing hand: medium-light skin tone"
}, {"code": "270d_1f3fd", "name": "writing hand: medium skin tone"}, {
    "code": "270d_1f3fe",
    "name": "writing hand: medium-dark skin tone"
}, {"code": "270d_1f3ff", "name": "writing hand: dark skin tone"}, {
    "code": "1f450",
    "name": "open hands"
}, {"code": "1f450_1f3fb", "name": "open hands: light skin tone"}, {
    "code": "1f450_1f3fc",
    "name": "open hands: medium-light skin tone"
}, {"code": "1f450_1f3fd", "name": "open hands: medium skin tone"}, {
    "code": "1f450_1f3fe",
    "name": "open hands: medium-dark skin tone"
}, {"code": "1f450_1f3ff", "name": "open hands: dark skin tone"}, {
    "code": "1f64c",
    "name": "raising hands"
}, {"code": "1f64c_1f3fb", "name": "raising hands: light skin tone"}, {
    "code": "1f64c_1f3fc",
    "name": "raising hands: medium-light skin tone"
}, {"code": "1f64c_1f3fd", "name": "raising hands: medium skin tone"}, {
    "code": "1f64c_1f3fe",
    "name": "raising hands: medium-dark skin tone"
}, {"code": "1f64c_1f3ff", "name": "raising hands: dark skin tone"}, {
    "code": "1f64f",
    "name": "folded hands"
}, {"code": "1f64f_1f3fb", "name": "folded hands: light skin tone"}, {
    "code": "1f64f_1f3fc",
    "name": "folded hands: medium-light skin tone"
}, {"code": "1f64f_1f3fd", "name": "folded hands: medium skin tone"}, {
    "code": "1f64f_1f3fe",
    "name": "folded hands: medium-dark skin tone"
}, {"code": "1f64f_1f3ff", "name": "folded hands: dark skin tone"}, {
    "code": "1f91d",
    "name": "handshake"
}, {"code": "1f485", "name": "nail polish"}, {
    "code": "1f485_1f3fb",
    "name": "nail polish: light skin tone"
}, {"code": "1f485_1f3fc", "name": "nail polish: medium-light skin tone"}, {
    "code": "1f485_1f3fd",
    "name": "nail polish: medium skin tone"
}, {"code": "1f485_1f3fe", "name": "nail polish: medium-dark skin tone"}, {
    "code": "1f485_1f3ff",
    "name": "nail polish: dark skin tone"
}, {"code": "1f442", "name": "ear"}, {"code": "1f442_1f3fb", "name": "ear: light skin tone"}, {
    "code": "1f442_1f3fc",
    "name": "ear: medium-light skin tone"
}, {"code": "1f442_1f3fd", "name": "ear: medium skin tone"}, {
    "code": "1f442_1f3fe",
    "name": "ear: medium-dark skin tone"
}, {"code": "1f442_1f3ff", "name": "ear: dark skin tone"}, {"code": "1f443", "name": "nose"}, {
    "code": "1f443_1f3fb",
    "name": "nose: light skin tone"
}, {"code": "1f443_1f3fc", "name": "nose: medium-light skin tone"}, {
    "code": "1f443_1f3fd",
    "name": "nose: medium skin tone"
}, {"code": "1f443_1f3fe", "name": "nose: medium-dark skin tone"}, {
    "code": "1f443_1f3ff",
    "name": "nose: dark skin tone"
}, {"code": "1f463", "name": "footprints"}, {"code": "1f440", "name": "eyes"}, {
    "code": "1f441",
    "name": "eye"
}, {"code": "1f441_fe0f_200d_1f5e8_fe0f", "name": "eye in speech bubble"}, {
    "code": "1f445",
    "name": "tongue"
}, {"code": "1f444", "name": "mouth"}, {"code": "1f48b", "name": "kiss mark"}, {
    "code": "1f498",
    "name": "heart with arrow"
}, {"code": "2764", "name": "red heart"}, {"code": "1f493", "name": "beating heart"}, {
    "code": "1f494",
    "name": "broken heart"
}, {"code": "1f495", "name": "two hearts"}, {"code": "1f496", "name": "sparkling heart"}, {
    "code": "1f497",
    "name": "growing heart"
}, {"code": "1f499", "name": "blue heart"}, {"code": "1f49a", "name": "green heart"}, {
    "code": "1f49b",
    "name": "yellow heart"
}, {"code": "1f49c", "name": "purple heart"}, {"code": "1f5a4", "name": "black heart"}, {
    "code": "1f49d",
    "name": "heart with ribbon"
}, {"code": "1f49e", "name": "revolving hearts"}, {"code": "1f49f", "name": "heart decoration"}, {
    "code": "2763",
    "name": "heavy heart exclamation"
}, {"code": "1f48c", "name": "love letter"}, {"code": "1f4a4", "name": "zzz"}, {
    "code": "1f4a2",
    "name": "anger symbol"
}, {"code": "1f4a3", "name": "bomb"}, {"code": "1f4a5", "name": "collision"}, {
    "code": "1f4a6",
    "name": "sweat droplets"
}, {"code": "1f4a8", "name": "dashing away"}, {"code": "1f4ab", "name": "dizzy"}, {
    "code": "1f4ac",
    "name": "speech balloon"
}, {"code": "1f5e8", "name": "left speech bubble"}, {"code": "1f5ef", "name": "right anger bubble"}, {
    "code": "1f4ad",
    "name": "thought balloon"
}, {"code": "1f573", "name": "hole"}, {"code": "1f453", "name": "glasses"}, {
    "code": "1f576",
    "name": "sunglasses"
}, {"code": "1f454", "name": "necktie"}, {"code": "1f455", "name": "t-shirt"}, {
    "code": "1f456",
    "name": "jeans"
}, {"code": "1f457", "name": "dress"}, {"code": "1f458", "name": "kimono"}, {
    "code": "1f459",
    "name": "bikini"
}, {"code": "1f45a", "name": "woman’s clothes"}, {"code": "1f45b", "name": "purse"}, {
    "code": "1f45c",
    "name": "handbag"
}, {"code": "1f45d", "name": "clutch bag"}, {"code": "1f6cd", "name": "shopping bags"}, {
    "code": "1f392",
    "name": "school backpack"
}, {"code": "1f45e", "name": "man’s shoe"}, {"code": "1f45f", "name": "running shoe"}, {
    "code": "1f460",
    "name": "high-heeled shoe"
}, {"code": "1f461", "name": "woman’s sandal"}, {"code": "1f462", "name": "woman’s boot"}, {
    "code": "1f451",
    "name": "crown"
}, {"code": "1f452", "name": "woman’s hat"}, {"code": "1f3a9", "name": "top hat"}, {
    "code": "1f393",
    "name": "graduation cap"
}, {"code": "26d1", "name": "rescue worker’s helmet"}, {"code": "1f4ff", "name": "prayer beads"}, {
    "code": "1f484",
    "name": "lipstick"
}, {"code": "1f48d", "name": "ring"}, {"code": "1f48e", "name": "gem stone"}, {
    "code": "1f435",
    "name": "monkey face"
}, {"code": "1f412", "name": "monkey"}, {"code": "1f98d", "name": "gorilla"}, {
    "code": "1f436",
    "name": "dog face"
}, {"code": "1f415", "name": "dog"}, {"code": "1f429", "name": "poodle"}, {
    "code": "1f43a",
    "name": "wolf face"
}, {"code": "1f98a", "name": "fox face"}, {"code": "1f431", "name": "cat face"}, {
    "code": "1f408",
    "name": "cat"
}, {"code": "1f981", "name": "lion face"}, {"code": "1f42f", "name": "tiger face"}, {
    "code": "1f405",
    "name": "tiger"
}, {"code": "1f406", "name": "leopard"}, {"code": "1f434", "name": "horse face"}, {
    "code": "1f40e",
    "name": "horse"
}, {"code": "1f98c", "name": "deer"}, {"code": "1f984", "name": "unicorn face"}, {
    "code": "1f42e",
    "name": "cow face"
}, {"code": "1f402", "name": "ox"}, {"code": "1f403", "name": "water buffalo"}, {
    "code": "1f404",
    "name": "cow"
}, {"code": "1f437", "name": "pig face"}, {"code": "1f416", "name": "pig"}, {
    "code": "1f417",
    "name": "boar"
}, {"code": "1f43d", "name": "pig nose"}, {"code": "1f40f", "name": "ram"}, {
    "code": "1f411",
    "name": "sheep"
}, {"code": "1f410", "name": "goat"}, {"code": "1f42a", "name": "camel"}, {
    "code": "1f42b",
    "name": "two-hump camel"
}, {"code": "1f418", "name": "elephant"}, {"code": "1f98f", "name": "rhinoceros"}, {
    "code": "1f42d",
    "name": "mouse face"
}, {"code": "1f401", "name": "mouse"}, {"code": "1f400", "name": "rat"}, {
    "code": "1f439",
    "name": "hamster face"
}, {"code": "1f430", "name": "rabbit face"}, {"code": "1f407", "name": "rabbit"}, {
    "code": "1f43f",
    "name": "chipmunk"
}, {"code": "1f987", "name": "bat"}, {"code": "1f43b", "name": "bear face"}, {
    "code": "1f428",
    "name": "koala"
}, {"code": "1f43c", "name": "panda face"}, {"code": "1f43e", "name": "paw prints"}, {
    "code": "1f983",
    "name": "turkey"
}, {"code": "1f414", "name": "chicken"}, {"code": "1f413", "name": "rooster"}, {
    "code": "1f423",
    "name": "hatching chick"
}, {"code": "1f424", "name": "baby chick"}, {"code": "1f425", "name": "front-facing baby chick"}, {
    "code": "1f426",
    "name": "bird"
}, {"code": "1f427", "name": "penguin"}, {"code": "1f54a", "name": "dove"}, {
    "code": "1f985",
    "name": "eagle"
}, {"code": "1f986", "name": "duck"}, {"code": "1f989", "name": "owl"}, {
    "code": "1f438",
    "name": "frog face"
}, {"code": "1f40a", "name": "crocodile"}, {"code": "1f422", "name": "turtle"}, {
    "code": "1f98e",
    "name": "lizard"
}, {"code": "1f40d", "name": "snake"}, {"code": "1f432", "name": "dragon face"}, {
    "code": "1f409",
    "name": "dragon"
}, {"code": "1f433", "name": "spouting whale"}, {"code": "1f40b", "name": "whale"}, {
    "code": "1f42c",
    "name": "dolphin"
}, {"code": "1f41f", "name": "fish"}, {"code": "1f420", "name": "tropical fish"}, {
    "code": "1f421",
    "name": "blowfish"
}, {"code": "1f988", "name": "shark"}, {"code": "1f419", "name": "octopus"}, {
    "code": "1f41a",
    "name": "spiral shell"
}, {"code": "1f980", "name": "crab"}, {"code": "1f990", "name": "shrimp"}, {
    "code": "1f991",
    "name": "squid"
}, {"code": "1f98b", "name": "butterfly"}, {"code": "1f40c", "name": "snail"}, {
    "code": "1f41b",
    "name": "bug"
}, {"code": "1f41c", "name": "ant"}, {"code": "1f41d", "name": "honeybee"}, {
    "code": "1f41e",
    "name": "lady beetle"
}, {"code": "1f577", "name": "spider"}, {"code": "1f578", "name": "spider web"}, {
    "code": "1f982",
    "name": "scorpion"
}, {"code": "1f490", "name": "bouquet"}, {"code": "1f338", "name": "cherry blossom"}, {
    "code": "1f4ae",
    "name": "white flower"
}, {"code": "1f3f5", "name": "rosette"}, {"code": "1f339", "name": "rose"}, {
    "code": "1f940",
    "name": "wilted flower"
}, {"code": "1f33a", "name": "hibiscus"}, {"code": "1f33b", "name": "sunflower"}, {
    "code": "1f33c",
    "name": "blossom"
}, {"code": "1f337", "name": "tulip"}, {"code": "1f331", "name": "seedling"}, {
    "code": "1f332",
    "name": "evergreen tree"
}, {"code": "1f333", "name": "deciduous tree"}, {"code": "1f334", "name": "palm tree"}, {
    "code": "1f335",
    "name": "cactus"
}, {"code": "1f33e", "name": "sheaf of rice"}, {"code": "1f33f", "name": "herb"}, {
    "code": "2618",
    "name": "shamrock"
}, {"code": "1f340", "name": "four leaf clover"}, {"code": "1f341", "name": "maple leaf"}, {
    "code": "1f342",
    "name": "fallen leaf"
}, {"code": "1f343", "name": "leaf fluttering in wind"}, {"code": "1f347", "name": "grapes"}, {
    "code": "1f348",
    "name": "melon"
}, {"code": "1f349", "name": "watermelon"}, {"code": "1f34a", "name": "tangerine"}, {
    "code": "1f34b",
    "name": "lemon"
}, {"code": "1f34c", "name": "banana"}, {"code": "1f34d", "name": "pineapple"}, {
    "code": "1f34e",
    "name": "red apple"
}, {"code": "1f34f", "name": "green apple"}, {"code": "1f350", "name": "pear"}, {
    "code": "1f351",
    "name": "peach"
}, {"code": "1f352", "name": "cherries"}, {"code": "1f353", "name": "strawberry"}, {
    "code": "1f95d",
    "name": "kiwi fruit"
}, {"code": "1f345", "name": "tomato"}, {"code": "1f951", "name": "avocado"}, {
    "code": "1f346",
    "name": "eggplant"
}, {"code": "1f954", "name": "potato"}, {"code": "1f955", "name": "carrot"}, {
    "code": "1f33d",
    "name": "ear of corn"
}, {"code": "1f336", "name": "hot pepper"}, {"code": "1f952", "name": "cucumber"}, {
    "code": "1f344",
    "name": "mushroom"
}, {"code": "1f95c", "name": "peanuts"}, {"code": "1f330", "name": "chestnut"}, {
    "code": "1f35e",
    "name": "bread"
}, {"code": "1f950", "name": "croissant"}, {"code": "1f956", "name": "baguette bread"}, {
    "code": "1f95e",
    "name": "pancakes"
}, {"code": "1f9c0", "name": "cheese wedge"}, {"code": "1f356", "name": "meat on bone"}, {
    "code": "1f357",
    "name": "poultry leg"
}, {"code": "1f953", "name": "bacon"}, {"code": "1f354", "name": "hamburger"}, {
    "code": "1f35f",
    "name": "french fries"
}, {"code": "1f355", "name": "pizza"}, {"code": "1f32d", "name": "hot dog"}, {
    "code": "1f32e",
    "name": "taco"
}, {"code": "1f32f", "name": "burrito"}, {"code": "1f959", "name": "stuffed flatbread"}, {
    "code": "1f95a",
    "name": "egg"
}, {"code": "1f373", "name": "cooking"}, {"code": "1f958", "name": "shallow pan of food"}, {
    "code": "1f372",
    "name": "pot of food"
}, {"code": "1f957", "name": "green salad"}, {"code": "1f37f", "name": "popcorn"}, {
    "code": "1f371",
    "name": "bento box"
}, {"code": "1f358", "name": "rice cracker"}, {"code": "1f359", "name": "rice ball"}, {
    "code": "1f35a",
    "name": "cooked rice"
}, {"code": "1f35b", "name": "curry rice"}, {"code": "1f35c", "name": "steaming bowl"}, {
    "code": "1f35d",
    "name": "spaghetti"
}, {"code": "1f360", "name": "roasted sweet potato"}, {"code": "1f362", "name": "oden"}, {
    "code": "1f363",
    "name": "sushi"
}, {"code": "1f364", "name": "fried shrimp"}, {"code": "1f365", "name": "fish cake with swirl"}, {
    "code": "1f361",
    "name": "dango"
}, {"code": "1f366", "name": "soft ice cream"}, {"code": "1f367", "name": "shaved ice"}, {
    "code": "1f368",
    "name": "ice cream"
}, {"code": "1f369", "name": "doughnut"}, {"code": "1f36a", "name": "cookie"}, {
    "code": "1f382",
    "name": "birthday cake"
}, {"code": "1f370", "name": "shortcake"}, {"code": "1f36b", "name": "chocolate bar"}, {
    "code": "1f36c",
    "name": "candy"
}, {"code": "1f36d", "name": "lollipop"}, {"code": "1f36e", "name": "custard"}, {
    "code": "1f36f",
    "name": "honey pot"
}, {"code": "1f37c", "name": "baby bottle"}, {"code": "1f95b", "name": "glass of milk"}, {
    "code": "2615",
    "name": "hot beverage"
}, {"code": "1f375", "name": "teacup without handle"}, {"code": "1f376", "name": "sake"}, {
    "code": "1f37e",
    "name": "bottle with popping cork"
}, {"code": "1f377", "name": "wine glass"}, {"code": "1f378", "name": "cocktail glass"}, {
    "code": "1f379",
    "name": "tropical drink"
}, {"code": "1f37a", "name": "beer mug"}, {"code": "1f37b", "name": "clinking beer mugs"}, {
    "code": "1f942",
    "name": "clinking glasses"
}, {"code": "1f943", "name": "tumbler glass"}, {"code": "1f37d", "name": "fork and knife with plate"}, {
    "code": "1f374",
    "name": "fork and knife"
}, {"code": "1f944", "name": "spoon"}, {"code": "1f52a", "name": "kitchen knife"}, {
    "code": "1f3fa",
    "name": "amphora"
}, {"code": "1f30d", "name": "globe showing Europe-Africa"}, {
    "code": "1f30e",
    "name": "globe showing Americas"
}, {"code": "1f30f", "name": "globe showing Asia-Australia"}, {
    "code": "1f310",
    "name": "globe with meridians"
}, {"code": "1f5fa", "name": "world map"}, {"code": "1f5fe", "name": "map of Japan"}, {
    "code": "1f3d4",
    "name": "snow-capped mountain"
}, {"code": "26f0", "name": "mountain"}, {"code": "1f30b", "name": "volcano"}, {
    "code": "1f5fb",
    "name": "mount fuji"
}, {"code": "1f3d5", "name": "camping"}, {"code": "1f3d6", "name": "beach with umbrella"}, {
    "code": "1f3dc",
    "name": "desert"
}, {"code": "1f3dd", "name": "desert island"}, {"code": "1f3de", "name": "national park"}, {
    "code": "1f3df",
    "name": "stadium"
}, {"code": "1f3db", "name": "classical building"}, {
    "code": "1f3d7",
    "name": "building construction"
}, {"code": "1f3d8", "name": "house"}, {"code": "1f3d9", "name": "cityscape"}, {
    "code": "1f3da",
    "name": "derelict house"
}, {"code": "1f3e0", "name": "house"}, {"code": "1f3e1", "name": "house with garden"}, {
    "code": "1f3e2",
    "name": "office building"
}, {"code": "1f3e3", "name": "Japanese post office"}, {"code": "1f3e4", "name": "post office"}, {
    "code": "1f3e5",
    "name": "hospital"
}, {"code": "1f3e6", "name": "bank"}, {"code": "1f3e8", "name": "hotel"}, {
    "code": "1f3e9",
    "name": "love hotel"
}, {"code": "1f3ea", "name": "convenience store"}, {"code": "1f3eb", "name": "school"}, {
    "code": "1f3ec",
    "name": "department store"
}, {"code": "1f3ed", "name": "factory"}, {"code": "1f3ef", "name": "Japanese castle"}, {
    "code": "1f3f0",
    "name": "castle"
}, {"code": "1f492", "name": "wedding"}, {"code": "1f5fc", "name": "Tokyo tower"}, {
    "code": "1f5fd",
    "name": "Statue of Liberty"
}, {"code": "26ea", "name": "church"}, {"code": "1f54c", "name": "mosque"}, {
    "code": "1f54d",
    "name": "synagogue"
}, {"code": "26e9", "name": "shinto shrine"}, {"code": "1f54b", "name": "kaaba"}, {
    "code": "26f2",
    "name": "fountain"
}, {"code": "26fa", "name": "tent"}, {"code": "1f301", "name": "foggy"}, {
    "code": "1f303",
    "name": "night with stars"
}, {"code": "1f304", "name": "sunrise over mountains"}, {"code": "1f305", "name": "sunrise"}, {
    "code": "1f306",
    "name": "cityscape at dusk"
}, {"code": "1f307", "name": "sunset"}, {"code": "1f309", "name": "bridge at night"}, {
    "code": "2668",
    "name": "hot springs"
}, {"code": "1f30c", "name": "milky way"}, {"code": "1f3a0", "name": "carousel horse"}, {
    "code": "1f3a1",
    "name": "ferris wheel"
}, {"code": "1f3a2", "name": "roller coaster"}, {"code": "1f488", "name": "barber pole"}, {
    "code": "1f3aa",
    "name": "circus tent"
}, {"code": "1f3ad", "name": "performing arts"}, {"code": "1f5bc", "name": "framed picture"}, {
    "code": "1f3a8",
    "name": "artist palette"
}, {"code": "1f3b0", "name": "slot machine"}, {"code": "1f682", "name": "locomotive"}, {
    "code": "1f683",
    "name": "railway car"
}, {"code": "1f684", "name": "high-speed train"}, {
    "code": "1f685",
    "name": "high-speed train with bullet nose"
}, {"code": "1f686", "name": "train"}, {"code": "1f687", "name": "metro"}, {
    "code": "1f688",
    "name": "light rail"
}, {"code": "1f689", "name": "station"}, {"code": "1f68a", "name": "tram"}, {
    "code": "1f69d",
    "name": "monorail"
}, {"code": "1f69e", "name": "mountain railway"}, {"code": "1f68b", "name": "tram car"}, {
    "code": "1f68c",
    "name": "bus"
}, {"code": "1f68d", "name": "oncoming bus"}, {"code": "1f68e", "name": "trolleybus"}, {
    "code": "1f690",
    "name": "minibus"
}, {"code": "1f691", "name": "ambulance"}, {"code": "1f692", "name": "fire engine"}, {
    "code": "1f693",
    "name": "police car"
}, {"code": "1f694", "name": "oncoming police car"}, {"code": "1f695", "name": "taxi"}, {
    "code": "1f696",
    "name": "oncoming taxi"
}, {"code": "1f697", "name": "automobile"}, {"code": "1f698", "name": "oncoming automobile"}, {
    "code": "1f699",
    "name": "sport utility vehicle"
}, {"code": "1f69a", "name": "delivery truck"}, {"code": "1f69b", "name": "articulated lorry"}, {
    "code": "1f69c",
    "name": "tractor"
}, {"code": "1f6b2", "name": "bicycle"}, {"code": "1f6f4", "name": "kick scooter"}, {
    "code": "1f6f5",
    "name": "motor scooter"
}, {"code": "1f68f", "name": "bus stop"}, {"code": "1f6e3", "name": "motorway"}, {
    "code": "1f6e4",
    "name": "railway track"
}, {"code": "26fd", "name": "fuel pump"}, {"code": "1f6a8", "name": "police car light"}, {
    "code": "1f6a5",
    "name": "horizontal traffic light"
}, {"code": "1f6a6", "name": "vertical traffic light"}, {"code": "1f6a7", "name": "construction"}, {
    "code": "1f6d1",
    "name": "stop sign"
}, {"code": "2693", "name": "anchor"}, {"code": "26f5", "name": "sailboat"}, {
    "code": "1f6f6",
    "name": "canoe"
}, {"code": "1f6a4", "name": "speedboat"}, {"code": "1f6f3", "name": "passenger ship"}, {
    "code": "26f4",
    "name": "ferry"
}, {"code": "1f6e5", "name": "motor boat"}, {"code": "1f6a2", "name": "ship"}, {
    "code": "2708",
    "name": "airplane"
}, {"code": "1f6e9", "name": "small airplane"}, {"code": "1f6eb", "name": "airplane departure"}, {
    "code": "1f6ec",
    "name": "airplane arrival"
}, {"code": "1f4ba", "name": "seat"}, {"code": "1f681", "name": "helicopter"}, {
    "code": "1f69f",
    "name": "suspension railway"
}, {"code": "1f6a0", "name": "mountain cableway"}, {"code": "1f6a1", "name": "aerial tramway"}, {
    "code": "1f680",
    "name": "rocket"
}, {"code": "1f6f0", "name": "satellite"}, {"code": "1f6ce", "name": "bellhop bell"}, {
    "code": "1f6aa",
    "name": "door"
}, {"code": "1f6cc", "name": "person in bed"}, {
    "code": "1f6cc_1f3fb",
    "name": "person in bed: light skin tone"
}, {"code": "1f6cc_1f3fc", "name": "person in bed: medium-light skin tone"}, {
    "code": "1f6cc_1f3fd",
    "name": "person in bed: medium skin tone"
}, {"code": "1f6cc_1f3fe", "name": "person in bed: medium-dark skin tone"}, {
    "code": "1f6cc_1f3ff",
    "name": "person in bed: dark skin tone"
}, {"code": "1f6cf", "name": "bed"}, {"code": "1f6cb", "name": "couch and lamp"}, {
    "code": "1f6bd",
    "name": "toilet"
}, {"code": "1f6bf", "name": "shower"}, {"code": "1f6c0", "name": "person taking bath"}, {
    "code": "1f6c0_1f3fb",
    "name": "person taking bath: light skin tone"
}, {"code": "1f6c0_1f3fc", "name": "person taking bath: medium-light skin tone"}, {
    "code": "1f6c0_1f3fd",
    "name": "person taking bath: medium skin tone"
}, {"code": "1f6c0_1f3fe", "name": "person taking bath: medium-dark skin tone"}, {
    "code": "1f6c0_1f3ff",
    "name": "person taking bath: dark skin tone"
}, {"code": "1f6c1", "name": "bathtub"}, {"code": "231b", "name": "hourglass"}, {
    "code": "23f3",
    "name": "hourglass with flowing sand"
}, {"code": "231a", "name": "watch"}, {"code": "23f0", "name": "alarm clock"}, {
    "code": "23f1",
    "name": "stopwatch"
}, {"code": "23f2", "name": "timer clock"}, {"code": "1f570", "name": "mantelpiece clock"}, {
    "code": "1f55b",
    "name": "twelve o’clock"
}, {"code": "1f567", "name": "twelve-thirty"}, {"code": "1f550", "name": "one o’clock"}, {
    "code": "1f55c",
    "name": "one-thirty"
}, {"code": "1f551", "name": "two o’clock"}, {"code": "1f55d", "name": "two-thirty"}, {
    "code": "1f552",
    "name": "three o’clock"
}, {"code": "1f55e", "name": "three-thirty"}, {"code": "1f553", "name": "four o’clock"}, {
    "code": "1f55f",
    "name": "four-thirty"
}, {"code": "1f554", "name": "five o’clock"}, {"code": "1f560", "name": "five-thirty"}, {
    "code": "1f555",
    "name": "six o’clock"
}, {"code": "1f561", "name": "six-thirty"}, {"code": "1f556", "name": "seven o’clock"}, {
    "code": "1f562",
    "name": "seven-thirty"
}, {"code": "1f557", "name": "eight o’clock"}, {"code": "1f563", "name": "eight-thirty"}, {
    "code": "1f558",
    "name": "nine o’clock"
}, {"code": "1f564", "name": "nine-thirty"}, {"code": "1f559", "name": "ten o’clock"}, {
    "code": "1f565",
    "name": "ten-thirty"
}, {"code": "1f55a", "name": "eleven o’clock"}, {"code": "1f566", "name": "eleven-thirty"}, {
    "code": "1f311",
    "name": "new moon"
}, {"code": "1f312", "name": "waxing crescent moon"}, {"code": "1f313", "name": "first quarter moon"}, {
    "code": "1f314",
    "name": "waxing gibbous moon"
}, {"code": "1f315", "name": "full moon"}, {"code": "1f316", "name": "waning gibbous moon"}, {
    "code": "1f317",
    "name": "last quarter moon"
}, {"code": "1f318", "name": "waning crescent moon"}, {"code": "1f319", "name": "crescent moon"}, {
    "code": "1f31a",
    "name": "new moon face"
}, {"code": "1f31b", "name": "first quarter moon with face"}, {
    "code": "1f31c",
    "name": "last quarter moon with face"
}, {"code": "1f321", "name": "thermometer"}, {"code": "2600", "name": "sun"}, {
    "code": "1f31d",
    "name": "full moon with face"
}, {"code": "1f31e", "name": "sun with face"}, {"code": "2b50", "name": "white medium star"}, {
    "code": "1f31f",
    "name": "glowing star"
}, {"code": "1f320", "name": "shooting star"}, {"code": "2601", "name": "cloud"}, {
    "code": "26c5",
    "name": "sun behind cloud"
}, {"code": "26c8", "name": "cloud with lightning and rain"}, {
    "code": "1f324",
    "name": "sun behind small cloud"
}, {"code": "1f325", "name": "sun behind large cloud"}, {
    "code": "1f326",
    "name": "sun behind rain cloud"
}, {"code": "1f327", "name": "cloud with rain"}, {"code": "1f328", "name": "cloud with snow"}, {
    "code": "1f329",
    "name": "cloud with lightning"
}, {"code": "1f32a", "name": "tornado"}, {"code": "1f32b", "name": "fog"}, {
    "code": "1f32c",
    "name": "wind face"
}, {"code": "1f300", "name": "cyclone"}, {"code": "1f308", "name": "rainbow"}, {
    "code": "1f302",
    "name": "closed umbrella"
}, {"code": "2602", "name": "umbrella"}, {"code": "2614", "name": "umbrella with rain drops"}, {
    "code": "26f1",
    "name": "umbrella on ground"
}, {"code": "26a1", "name": "high voltage"}, {"code": "2744", "name": "snowflake"}, {
    "code": "2603",
    "name": "snowman"
}, {"code": "26c4", "name": "snowman without snow"}, {"code": "2604", "name": "comet"}, {
    "code": "1f525",
    "name": "fire"
}, {"code": "1f4a7", "name": "droplet"}, {"code": "1f30a", "name": "water wave"}, {
    "code": "1f383",
    "name": "jack-o-lantern"
}, {"code": "1f384", "name": "Christmas tree"}, {"code": "1f386", "name": "fireworks"}, {
    "code": "1f387",
    "name": "sparkler"
}, {"code": "2728", "name": "sparkles"}, {"code": "1f388", "name": "balloon"}, {
    "code": "1f389",
    "name": "party popper"
}, {"code": "1f38a", "name": "confetti ball"}, {"code": "1f38b", "name": "tanabata tree"}, {
    "code": "1f38d",
    "name": "pine decoration"
}, {"code": "1f38e", "name": "Japanese dolls"}, {"code": "1f38f", "name": "carp streamer"}, {
    "code": "1f390",
    "name": "wind chime"
}, {"code": "1f391", "name": "moon viewing ceremony"}, {"code": "1f380", "name": "ribbon"}, {
    "code": "1f381",
    "name": "wrapped gift"
}, {"code": "1f397", "name": "reminder ribbon"}, {"code": "1f39f", "name": "admission tickets"}, {
    "code": "1f3ab",
    "name": "ticket"
}, {"code": "1f396", "name": "military medal"}, {"code": "1f3c6", "name": "trophy"}, {
    "code": "1f3c5",
    "name": "sports medal"
}, {"code": "1f947", "name": "1st place medal"}, {"code": "1f948", "name": "2nd place medal"}, {
    "code": "1f949",
    "name": "3rd place medal"
}, {"code": "26bd", "name": "soccer ball"}, {"code": "26be", "name": "baseball"}, {
    "code": "1f3c0",
    "name": "basketball"
}, {"code": "1f3d0", "name": "volleyball"}, {"code": "1f3c8", "name": "american football"}, {
    "code": "1f3c9",
    "name": "rugby football"
}, {"code": "1f3be", "name": "tennis"}, {"code": "1f3b1", "name": "pool 8 ball"}, {
    "code": "1f3b3",
    "name": "bowling"
}, {"code": "1f3cf", "name": "cricket"}, {"code": "1f3d1", "name": "field hockey"}, {
    "code": "1f3d2",
    "name": "ice hockey"
}, {"code": "1f3d3", "name": "ping pong"}, {"code": "1f3f8", "name": "badminton"}, {
    "code": "1f94a",
    "name": "boxing glove"
}, {"code": "1f94b", "name": "martial arts uniform"}, {"code": "1f945", "name": "goal net"}, {
    "code": "1f3af",
    "name": "direct hit"
}, {"code": "26f3", "name": "flag in hole"}, {"code": "26f8", "name": "ice skate"}, {
    "code": "1f3a3",
    "name": "fishing pole"
}, {"code": "1f3bd", "name": "running shirt"}, {"code": "1f3bf", "name": "skis"}, {
    "code": "1f3ae",
    "name": "video game"
}, {"code": "1f579", "name": "joystick"}, {"code": "1f3b2", "name": "game die"}, {
    "code": "2660",
    "name": "spade suit"
}, {"code": "2665", "name": "heart suit"}, {"code": "2666", "name": "diamond suit"}, {
    "code": "2663",
    "name": "club suit"
}, {"code": "1f0cf", "name": "joker"}, {"code": "1f004", "name": "mahjong red dragon"}, {
    "code": "1f3b4",
    "name": "flower playing cards"
}, {"code": "1f507", "name": "muted speaker"}, {"code": "1f508", "name": "speaker low volume"}, {
    "code": "1f509",
    "name": "speaker medium volume"
}, {"code": "1f50a", "name": "speaker high volume"}, {"code": "1f4e2", "name": "loudspeaker"}, {
    "code": "1f4e3",
    "name": "megaphone"
}, {"code": "1f4ef", "name": "postal horn"}, {"code": "1f514", "name": "bell"}, {
    "code": "1f515",
    "name": "bell with slash"
}, {"code": "1f3bc", "name": "musical score"}, {"code": "1f3b5", "name": "musical note"}, {
    "code": "1f3b6",
    "name": "musical notes"
}, {"code": "1f399", "name": "studio microphone"}, {"code": "1f39a", "name": "level slider"}, {
    "code": "1f39b",
    "name": "control knobs"
}, {"code": "1f3a4", "name": "microphone"}, {"code": "1f3a7", "name": "headphone"}, {
    "code": "1f4fb",
    "name": "radio"
}, {"code": "1f3b7", "name": "saxophone"}, {"code": "1f3b8", "name": "guitar"}, {
    "code": "1f3b9",
    "name": "musical keyboard"
}, {"code": "1f3ba", "name": "trumpet"}, {"code": "1f3bb", "name": "violin"}, {
    "code": "1f941",
    "name": "drum"
}, {"code": "1f4f1", "name": "mobile phone"}, {"code": "1f4f2", "name": "mobile phone with arrow"}, {
    "code": "260e",
    "name": "telephone"
}, {"code": "1f4de", "name": "telephone receiver"}, {"code": "1f4df", "name": "pager"}, {
    "code": "1f4e0",
    "name": "fax machine"
}, {"code": "1f50b", "name": "battery"}, {"code": "1f50c", "name": "electric plug"}, {
    "code": "1f4bb",
    "name": "laptop computer"
}, {"code": "1f5a5", "name": "desktop computer"}, {"code": "1f5a8", "name": "printer"}, {
    "code": "2328",
    "name": "keyboard"
}, {"code": "1f5b1", "name": "computer mouse"}, {"code": "1f5b2", "name": "trackball"}, {
    "code": "1f4bd",
    "name": "computer disk"
}, {"code": "1f4be", "name": "floppy disk"}, {"code": "1f4bf", "name": "optical disk"}, {
    "code": "1f4c0",
    "name": "dvd"
}, {"code": "1f3a5", "name": "movie camera"}, {"code": "1f39e", "name": "film frames"}, {
    "code": "1f4fd",
    "name": "film projector"
}, {"code": "1f3ac", "name": "clapper board"}, {"code": "1f4fa", "name": "television"}, {
    "code": "1f4f7",
    "name": "camera"
}, {"code": "1f4f8", "name": "camera with flash"}, {"code": "1f4f9", "name": "video camera"}, {
    "code": "1f4fc",
    "name": "videocassette"
}, {"code": "1f50d", "name": "left-pointing magnifying glass"}, {
    "code": "1f50e",
    "name": "right-pointing magnifying glass"
}, {"code": "1f52c", "name": "microscope"}, {"code": "1f52d", "name": "telescope"}, {
    "code": "1f4e1",
    "name": "satellite antenna"
}, {"code": "1f56f", "name": "candle"}, {"code": "1f4a1", "name": "light bulb"}, {
    "code": "1f526",
    "name": "flashlight"
}, {"code": "1f3ee", "name": "red paper lantern"}, {
    "code": "1f4d4",
    "name": "notebook with decorative cover"
}, {"code": "1f4d5", "name": "closed book"}, {"code": "1f4d6", "name": "open book"}, {
    "code": "1f4d7",
    "name": "green book"
}, {"code": "1f4d8", "name": "blue book"}, {"code": "1f4d9", "name": "orange book"}, {
    "code": "1f4da",
    "name": "books"
}, {"code": "1f4d3", "name": "notebook"}, {"code": "1f4d2", "name": "ledger"}, {
    "code": "1f4c3",
    "name": "page with curl"
}, {"code": "1f4dc", "name": "scroll"}, {"code": "1f4c4", "name": "page facing up"}, {
    "code": "1f4f0",
    "name": "newspaper"
}, {"code": "1f5de", "name": "rolled-up newspaper"}, {"code": "1f4d1", "name": "bookmark tabs"}, {
    "code": "1f516",
    "name": "bookmark"
}, {"code": "1f3f7", "name": "label"}, {"code": "1f4b0", "name": "money bag"}, {
    "code": "1f4b4",
    "name": "yen banknote"
}, {"code": "1f4b5", "name": "dollar banknote"}, {"code": "1f4b6", "name": "euro banknote"}, {
    "code": "1f4b7",
    "name": "pound banknote"
}, {"code": "1f4b8", "name": "money with wings"}, {"code": "1f4b3", "name": "credit card"}, {
    "code": "1f4b9",
    "name": "chart increasing with yen"
}, {"code": "1f4b1", "name": "currency exchange"}, {"code": "1f4b2", "name": "heavy dollar sign"}, {
    "code": "2709",
    "name": "envelope"
}, {"code": "1f4e7", "name": "e-mail"}, {"code": "1f4e8", "name": "incoming envelope"}, {
    "code": "1f4e9",
    "name": "envelope with arrow"
}, {"code": "1f4e4", "name": "outbox tray"}, {"code": "1f4e5", "name": "inbox tray"}, {
    "code": "1f4e6",
    "name": "package"
}, {"code": "1f4eb", "name": "closed mailbox with raised flag"}, {
    "code": "1f4ea",
    "name": "closed mailbox with lowered flag"
}, {"code": "1f4ec", "name": "open mailbox with raised flag"}, {
    "code": "1f4ed",
    "name": "open mailbox with lowered flag"
}, {"code": "1f4ee", "name": "postbox"}, {"code": "1f5f3", "name": "ballot box with ballot"}, {
    "code": "270f",
    "name": "pencil"
}, {"code": "2712", "name": "black nib"}, {"code": "1f58b", "name": "fountain pen"}, {
    "code": "1f58a",
    "name": "pen"
}, {"code": "1f58c", "name": "paintbrush"}, {"code": "1f58d", "name": "crayon"}, {
    "code": "1f4dd",
    "name": "memo"
}, {"code": "1f4bc", "name": "briefcase"}, {"code": "1f4c1", "name": "file folder"}, {
    "code": "1f4c2",
    "name": "open file folder"
}, {"code": "1f5c2", "name": "card index dividers"}, {"code": "1f4c5", "name": "calendar"}, {
    "code": "1f4c6",
    "name": "tear-off calendar"
}, {"code": "1f5d2", "name": "spiral notepad"}, {"code": "1f5d3", "name": "spiral calendar"}, {
    "code": "1f4c7",
    "name": "card index"
}, {"code": "1f4c8", "name": "chart increasing"}, {"code": "1f4c9", "name": "chart decreasing"}, {
    "code": "1f4ca",
    "name": "bar chart"
}, {"code": "1f4cb", "name": "clipboard"}, {"code": "1f4cc", "name": "pushpin"}, {
    "code": "1f4cd",
    "name": "round pushpin"
}, {"code": "1f4ce", "name": "paperclip"}, {"code": "1f587", "name": "linked paperclips"}, {
    "code": "1f4cf",
    "name": "straight ruler"
}, {"code": "1f4d0", "name": "triangular ruler"}, {"code": "2702", "name": "scissors"}, {
    "code": "1f5c3",
    "name": "card file box"
}, {"code": "1f5c4", "name": "file cabinet"}, {"code": "1f5d1", "name": "wastebasket"}, {
    "code": "1f512",
    "name": "locked"
}, {"code": "1f513", "name": "unlocked"}, {"code": "1f50f", "name": "locked with pen"}, {
    "code": "1f510",
    "name": "locked with key"
}, {"code": "1f511", "name": "key"}, {"code": "1f5dd", "name": "old key"}, {
    "code": "1f528",
    "name": "hammer"
}, {"code": "26cf", "name": "pick"}, {"code": "2692", "name": "hammer and pick"}, {
    "code": "1f6e0",
    "name": "hammer and wrench"
}, {"code": "1f5e1", "name": "dagger"}, {"code": "2694", "name": "crossed swords"}, {
    "code": "1f52b",
    "name": "pistol"
}, {"code": "1f3f9", "name": "bow and arrow"}, {"code": "1f6e1", "name": "shield"}, {
    "code": "1f527",
    "name": "wrench"
}, {"code": "1f529", "name": "nut and bolt"}, {"code": "2699", "name": "gear"}, {
    "code": "1f5dc",
    "name": "clamp"
}, {"code": "2697", "name": "alembic"}, {"code": "2696", "name": "balance scale"}, {
    "code": "1f517",
    "name": "link"
}, {"code": "26d3", "name": "chains"}, {"code": "1f489", "name": "syringe"}, {
    "code": "1f48a",
    "name": "pill"
}, {"code": "1f6ac", "name": "cigarette"}, {"code": "26b0", "name": "coffin"}, {
    "code": "26b1",
    "name": "funeral urn"
}, {"code": "1f5ff", "name": "moai"}, {"code": "1f6e2", "name": "oil drum"}, {
    "code": "1f52e",
    "name": "crystal ball"
}, {"code": "1f6d2", "name": "shopping cart"}, {"code": "1f3e7", "name": "ATM sign"}, {
    "code": "1f6ae",
    "name": "litter in bin sign"
}, {"code": "1f6b0", "name": "potable water"}, {"code": "267f", "name": "wheelchair symbol"}, {
    "code": "1f6b9",
    "name": "men’s room"
}, {"code": "1f6ba", "name": "women’s room"}, {"code": "1f6bb", "name": "restroom"}, {
    "code": "1f6bc",
    "name": "baby symbol"
}, {"code": "1f6be", "name": "water closet"}, {"code": "1f6c2", "name": "passport control"}, {
    "code": "1f6c3",
    "name": "customs"
}, {"code": "1f6c4", "name": "baggage claim"}, {"code": "1f6c5", "name": "left luggage"}, {
    "code": "26a0",
    "name": "warning"
}, {"code": "1f6b8", "name": "children crossing"}, {"code": "26d4", "name": "no entry"}, {
    "code": "1f6ab",
    "name": "prohibited"
}, {"code": "1f6b3", "name": "no bicycles"}, {"code": "1f6ad", "name": "no smoking"}, {
    "code": "1f6af",
    "name": "no littering"
}, {"code": "1f6b1", "name": "non-potable water"}, {"code": "1f6b7", "name": "no pedestrians"}, {
    "code": "1f4f5",
    "name": "no mobile phones"
}, {"code": "1f51e", "name": "no one under eighteen"}, {"code": "2622", "name": "radioactive"}, {
    "code": "2623",
    "name": "biohazard"
}, {"code": "2b06", "name": "up arrow"}, {"code": "2197", "name": "up-right arrow"}, {
    "code": "27a1",
    "name": "right arrow"
}, {"code": "2198", "name": "down-right arrow"}, {"code": "2b07", "name": "down arrow"}, {
    "code": "2199",
    "name": "down-left arrow"
}, {"code": "2b05", "name": "left arrow"}, {"code": "2196", "name": "up-left arrow"}, {
    "code": "2195",
    "name": "up-down arrow"
}, {"code": "2194", "name": "left-right arrow"}, {"code": "21a9", "name": "right arrow curving left"}, {
    "code": "21aa",
    "name": "left arrow curving right"
}, {"code": "2934", "name": "right arrow curving up"}, {
    "code": "2935",
    "name": "right arrow curving down"
}, {"code": "1f503", "name": "clockwise vertical arrows"}, {
    "code": "1f504",
    "name": "anticlockwise arrows button"
}, {"code": "1f519", "name": "BACK arrow"}, {"code": "1f51a", "name": "END arrow"}, {
    "code": "1f51b",
    "name": "ON! arrow"
}, {"code": "1f51c", "name": "SOON arrow"}, {"code": "1f51d", "name": "TOP arrow"}, {
    "code": "1f6d0",
    "name": "place of worship"
}, {"code": "269b", "name": "atom symbol"}, {"code": "1f549", "name": "om"}, {
    "code": "2721",
    "name": "star of David"
}, {"code": "2638", "name": "wheel of dharma"}, {"code": "262f", "name": "yin yang"}, {
    "code": "271d",
    "name": "latin cross"
}, {"code": "2626", "name": "orthodox cross"}, {"code": "262a", "name": "star and crescent"}, {
    "code": "262e",
    "name": "peace symbol"
}, {"code": "1f54e", "name": "menorah"}, {"code": "1f52f", "name": "dotted six-pointed star"}, {
    "code": "2648",
    "name": "Aries"
}, {"code": "2649", "name": "Taurus"}, {"code": "264a", "name": "Gemini"}, {
    "code": "264b",
    "name": "Cancer"
}, {"code": "264c", "name": "Leo"}, {"code": "264d", "name": "Virgo"}, {
    "code": "264e",
    "name": "Libra"
}, {"code": "264f", "name": "Scorpius"}, {"code": "2650", "name": "Sagittarius"}, {
    "code": "2651",
    "name": "Capricorn"
}, {"code": "2652", "name": "Aquarius"}, {"code": "2653", "name": "Pisces"}, {
    "code": "26ce",
    "name": "Ophiuchus"
}, {"code": "1f500", "name": "shuffle tracks button"}, {"code": "1f501", "name": "repeat button"}, {
    "code": "1f502",
    "name": "repeat single button"
}, {"code": "25b6", "name": "play button"}, {"code": "23e9", "name": "fast-forward button"}, {
    "code": "23ed",
    "name": "next track button"
}, {"code": "23ef", "name": "play or pause button"}, {"code": "25c0", "name": "reverse button"}, {
    "code": "23ea",
    "name": "fast reverse button"
}, {"code": "23ee", "name": "last track button"}, {"code": "1f53c", "name": "up button"}, {
    "code": "23eb",
    "name": "fast up button"
}, {"code": "1f53d", "name": "down button"}, {"code": "23ec", "name": "fast down button"}, {
    "code": "23f8",
    "name": "pause button"
}, {"code": "23f9", "name": "stop button"}, {"code": "23fa", "name": "record button"}, {
    "code": "23cf",
    "name": "eject button"
}, {"code": "1f3a6", "name": "cinema"}, {"code": "1f505", "name": "dim button"}, {
    "code": "1f506",
    "name": "bright button"
}, {"code": "1f4f6", "name": "antenna bars"}, {"code": "1f4f3", "name": "vibration mode"}, {
    "code": "1f4f4",
    "name": "mobile phone off"
}, {"code": "267b", "name": "recycling symbol"}, {"code": "1f4db", "name": "name badge"}, {
    "code": "269c",
    "name": "fleur-de-lis"
}, {"code": "1f530", "name": "Japanese symbol for beginner"}, {
    "code": "1f531",
    "name": "trident emblem"
}, {"code": "2b55", "name": "heavy large circle"}, {"code": "2705", "name": "white heavy check mark"}, {
    "code": "2611",
    "name": "ballot box with check"
}, {"code": "2714", "name": "heavy check mark"}, {"code": "2716", "name": "heavy multiplication x"}, {
    "code": "274c",
    "name": "cross mark"
}, {"code": "274e", "name": "cross mark button"}, {"code": "2795", "name": "heavy plus sign"}, {
    "code": "2640",
    "name": "female sign"
}, {"code": "2642", "name": "male sign"}, {"code": "2695", "name": "medical symbol"}, {
    "code": "2796",
    "name": "heavy minus sign"
}, {"code": "2797", "name": "heavy division sign"}, {"code": "27b0", "name": "curly loop"}, {
    "code": "27bf",
    "name": "double curly loop"
}, {"code": "303d", "name": "part alternation mark"}, {
    "code": "2733",
    "name": "eight-spoked asterisk"
}, {"code": "2734", "name": "eight-pointed star"}, {"code": "2747", "name": "sparkle"}, {
    "code": "203c",
    "name": "double exclamation mark"
}, {"code": "2049", "name": "exclamation question mark"}, {"code": "2753", "name": "question mark"}, {
    "code": "2754",
    "name": "white question mark"
}, {"code": "2755", "name": "white exclamation mark"}, {"code": "2757", "name": "exclamation mark"}, {
    "code": "3030",
    "name": "wavy dash"
}, {"code": "00a9", "name": "copyright"}, {"code": "00ae", "name": "registered"}, {
    "code": "2122",
    "name": "trade mark"
}, {"code": "0023_fe0f_20e3", "name": "keycap: #"}, {
    "code": "002a_fe0f_20e3",
    "name": "keycap: *"
}, {"code": "0030_fe0f_20e3", "name": "keycap: 0"}, {
    "code": "0031_fe0f_20e3",
    "name": "keycap: 1"
}, {"code": "0032_fe0f_20e3", "name": "keycap: 2"}, {
    "code": "0033_fe0f_20e3",
    "name": "keycap: 3"
}, {"code": "0034_fe0f_20e3", "name": "keycap: 4"}, {
    "code": "0035_fe0f_20e3",
    "name": "keycap: 5"
}, {"code": "0036_fe0f_20e3", "name": "keycap: 6"}, {
    "code": "0037_fe0f_20e3",
    "name": "keycap: 7"
}, {"code": "0038_fe0f_20e3", "name": "keycap: 8"}, {"code": "0039_fe0f_20e3", "name": "keycap: 9"}, {
    "code": "1f51f",
    "name": "keycap 10"
}, {"code": "1f4af", "name": "hundred points"}, {"code": "1f520", "name": "input latin uppercase"}, {
    "code": "1f521",
    "name": "input latin lowercase"
}, {"code": "1f522", "name": "input numbers"}, {"code": "1f523", "name": "input symbols"}, {
    "code": "1f524",
    "name": "input latin letters"
}, {"code": "1f170", "name": "A button (blood type)"}, {
    "code": "1f18e",
    "name": "AB button (blood type)"
}, {"code": "1f171", "name": "B button (blood type)"}, {"code": "1f191", "name": "CL button"}, {
    "code": "1f192",
    "name": "COOL button"
}, {"code": "1f193", "name": "FREE button"}, {"code": "2139", "name": "information"}, {
    "code": "1f194",
    "name": "ID button"
}, {"code": "24c2", "name": "circled M"}, {"code": "1f195", "name": "NEW button"}, {
    "code": "1f196",
    "name": "NG button"
}, {"code": "1f17e", "name": "O button (blood type)"}, {"code": "1f197", "name": "OK button"}, {
    "code": "1f17f",
    "name": "P button"
}, {"code": "1f198", "name": "SOS button"}, {"code": "1f199", "name": "UP! button"}, {
    "code": "1f19a",
    "name": "VS button"
}, {"code": "1f201", "name": "Japanese “here” button"}, {
    "code": "1f202",
    "name": "Japanese “service charge” button"
}, {"code": "1f237", "name": "Japanese “monthly amount” button"}, {
    "code": "1f236",
    "name": "Japanese “not free of charge” button"
}, {"code": "1f22f", "name": "Japanese “reserved” button"}, {
    "code": "1f250",
    "name": "Japanese “bargain” button"
}, {"code": "1f239", "name": "Japanese “discount” button"}, {
    "code": "1f21a",
    "name": "Japanese “free of charge” button"
}, {"code": "1f232", "name": "Japanese “prohibited” button"}, {
    "code": "1f251",
    "name": "Japanese “acceptable” button"
}, {"code": "1f238", "name": "Japanese “application” button"}, {
    "code": "1f234",
    "name": "Japanese “passing grade” button"
}, {"code": "1f233", "name": "Japanese “vacancy” button"}, {
    "code": "3297",
    "name": "Japanese “congratulations” button"
}, {"code": "3299", "name": "Japanese “secret” button"}, {
    "code": "1f23a",
    "name": "Japanese “open for business” button"
}, {"code": "1f235", "name": "Japanese “no vacancy” button"}, {
    "code": "25aa",
    "name": "black small square"
}, {"code": "25ab", "name": "white small square"}, {"code": "25fb", "name": "white medium square"}, {
    "code": "25fc",
    "name": "black medium square"
}, {"code": "25fd", "name": "white medium-small square"}, {
    "code": "25fe",
    "name": "black medium-small square"
}, {"code": "2b1b", "name": "black large square"}, {"code": "2b1c", "name": "white large square"}, {
    "code": "1f536",
    "name": "large orange diamond"
}, {"code": "1f537", "name": "large blue diamond"}, {"code": "1f538", "name": "small orange diamond"}, {
    "code": "1f539",
    "name": "small blue diamond"
}, {"code": "1f53a", "name": "red triangle pointed up"}, {
    "code": "1f53b",
    "name": "red triangle pointed down"
}, {"code": "1f4a0", "name": "diamond with a dot"}, {"code": "1f518", "name": "radio button"}, {
    "code": "1f532",
    "name": "black square button"
}, {"code": "1f533", "name": "white square button"}, {"code": "26aa", "name": "white circle"}, {
    "code": "26ab",
    "name": "black circle"
}, {"code": "1f534", "name": "red circle"}, {"code": "1f535", "name": "blue circle"}, {
    "code": "1f3c1",
    "name": "chequered flag"
}, {"code": "1f6a9", "name": "triangular flag"}, {"code": "1f38c", "name": "crossed flags"}, {
    "code": "1f3f4",
    "name": "black flag"
}, {"code": "1f3f3", "name": "white flag"}, {
    "code": "1f3f3_fe0f_200d_1f308",
    "name": "rainbow flag"
}, {"code": "1f1e6_1f1e8", "name": "Ascension Island"}, {
    "code": "1f1e6_1f1e9",
    "name": "Andorra"
}, {"code": "1f1e6_1f1ea", "name": "United Arab Emirates"}, {
    "code": "1f1e6_1f1eb",
    "name": "Afghanistan"
}, {"code": "1f1e6_1f1ec", "name": "Antigua & Barbuda"}, {
    "code": "1f1e6_1f1ee",
    "name": "Anguilla"
}, {"code": "1f1e6_1f1f1", "name": "Albania"}, {"code": "1f1e6_1f1f2", "name": "Armenia"}, {
    "code": "1f1e6_1f1f4",
    "name": "Angola"
}, {"code": "1f1e6_1f1f6", "name": "Antarctica"}, {"code": "1f1e6_1f1f7", "name": "Argentina"}, {
    "code": "1f1e6_1f1f8",
    "name": "American Samoa"
}, {"code": "1f1e6_1f1f9", "name": "Austria"}, {"code": "1f1e6_1f1fa", "name": "Australia"}, {
    "code": "1f1e6_1f1fc",
    "name": "Aruba"
}, {"code": "1f1e6_1f1fd", "name": "Åland Islands"}, {
    "code": "1f1e6_1f1ff",
    "name": "Azerbaijan"
}, {"code": "1f1e7_1f1e6", "name": "Bosnia & Herzegovina"}, {
    "code": "1f1e7_1f1e7",
    "name": "Barbados"
}, {"code": "1f1e7_1f1e9", "name": "Bangladesh"}, {"code": "1f1e7_1f1ea", "name": "Belgium"}, {
    "code": "1f1e7_1f1eb",
    "name": "Burkina Faso"
}, {"code": "1f1e7_1f1ec", "name": "Bulgaria"}, {"code": "1f1e7_1f1ed", "name": "Bahrain"}, {
    "code": "1f1e7_1f1ee",
    "name": "Burundi"
}, {"code": "1f1e7_1f1ef", "name": "Benin"}, {"code": "1f1e7_1f1f1", "name": "St. Barthélemy"}, {
    "code": "1f1e7_1f1f2",
    "name": "Bermuda"
}, {"code": "1f1e7_1f1f3", "name": "Brunei"}, {"code": "1f1e7_1f1f4", "name": "Bolivia"}, {
    "code": "1f1e7_1f1f6",
    "name": "Caribbean Netherlands"
}, {"code": "1f1e7_1f1f7", "name": "Brazil"}, {"code": "1f1e7_1f1f8", "name": "Bahamas"}, {
    "code": "1f1e7_1f1f9",
    "name": "Bhutan"
}, {"code": "1f1e7_1f1fb", "name": "Bouvet Island"}, {
    "code": "1f1e7_1f1fc",
    "name": "Botswana"
}, {"code": "1f1e7_1f1fe", "name": "Belarus"}, {"code": "1f1e7_1f1ff", "name": "Belize"}, {
    "code": "1f1e8_1f1e6",
    "name": "Canada"
}, {"code": "1f1e8_1f1e8", "name": "Cocos (Keeling) Islands"}, {
    "code": "1f1e8_1f1e9",
    "name": "Congo - Kinshasa"
}, {"code": "1f1e8_1f1eb", "name": "Central African Republic"}, {
    "code": "1f1e8_1f1ec",
    "name": "Congo - Brazzaville"
}, {"code": "1f1e8_1f1ed", "name": "Switzerland"}, {
    "code": "1f1e8_1f1ee",
    "name": "Côte d’Ivoire"
}, {"code": "1f1e8_1f1f0", "name": "Cook Islands"}, {"code": "1f1e8_1f1f1", "name": "Chile"}, {
    "code": "1f1e8_1f1f2",
    "name": "Cameroon"
}, {"code": "1f1e8_1f1f3", "name": "China"}, {"code": "1f1e8_1f1f4", "name": "Colombia"}, {
    "code": "1f1e8_1f1f5",
    "name": "Clipperton Island"
}, {"code": "1f1e8_1f1f7", "name": "Costa Rica"}, {"code": "1f1e8_1f1fa", "name": "Cuba"}, {
    "code": "1f1e8_1f1fb",
    "name": "Cape Verde"
}, {"code": "1f1e8_1f1fc", "name": "Curaçao"}, {
    "code": "1f1e8_1f1fd",
    "name": "Christmas Island"
}, {"code": "1f1e8_1f1fe", "name": "Cyprus"}, {"code": "1f1e8_1f1ff", "name": "Czech Republic"}, {
    "code": "1f1e9_1f1ea",
    "name": "Germany"
}, {"code": "1f1e9_1f1ec", "name": "Diego Garcia"}, {"code": "1f1e9_1f1ef", "name": "Djibouti"}, {
    "code": "1f1e9_1f1f0",
    "name": "Denmark"
}, {"code": "1f1e9_1f1f2", "name": "Dominica"}, {
    "code": "1f1e9_1f1f4",
    "name": "Dominican Republic"
}, {"code": "1f1e9_1f1ff", "name": "Algeria"}, {
    "code": "1f1ea_1f1e6",
    "name": "Ceuta & Melilla"
}, {"code": "1f1ea_1f1e8", "name": "Ecuador"}, {"code": "1f1ea_1f1ea", "name": "Estonia"}, {
    "code": "1f1ea_1f1ec",
    "name": "Egypt"
}, {"code": "1f1ea_1f1ed", "name": "Western Sahara"}, {
    "code": "1f1ea_1f1f7",
    "name": "Eritrea"
}, {"code": "1f1ea_1f1f8", "name": "Spain"}, {"code": "1f1ea_1f1f9", "name": "Ethiopia"}, {
    "code": "1f1ea_1f1fa",
    "name": "European Union"
}, {"code": "1f1eb_1f1ee", "name": "Finland"}, {"code": "1f1eb_1f1ef", "name": "Fiji"}, {
    "code": "1f1eb_1f1f0",
    "name": "Falkland Islands"
}, {"code": "1f1eb_1f1f2", "name": "Micronesia"}, {
    "code": "1f1eb_1f1f4",
    "name": "Faroe Islands"
}, {"code": "1f1eb_1f1f7", "name": "France"}, {"code": "1f1ec_1f1e6", "name": "Gabon"}, {
    "code": "1f1ec_1f1e7",
    "name": "United Kingdom"
}, {"code": "1f1ec_1f1e9", "name": "Grenada"}, {"code": "1f1ec_1f1ea", "name": "Georgia"}, {
    "code": "1f1ec_1f1eb",
    "name": "French Guiana"
}, {"code": "1f1ec_1f1ec", "name": "Guernsey"}, {"code": "1f1ec_1f1ed", "name": "Ghana"}, {
    "code": "1f1ec_1f1ee",
    "name": "Gibraltar"
}, {"code": "1f1ec_1f1f1", "name": "Greenland"}, {"code": "1f1ec_1f1f2", "name": "Gambia"}, {
    "code": "1f1ec_1f1f3",
    "name": "Guinea"
}, {"code": "1f1ec_1f1f5", "name": "Guadeloupe"}, {
    "code": "1f1ec_1f1f6",
    "name": "Equatorial Guinea"
}, {"code": "1f1ec_1f1f7", "name": "Greece"}, {
    "code": "1f1ec_1f1f8",
    "name": "South Georgia & South Sandwich Islands"
}, {"code": "1f1ec_1f1f9", "name": "Guatemala"}, {"code": "1f1ec_1f1fa", "name": "Guam"}, {
    "code": "1f1ec_1f1fc",
    "name": "Guinea-Bissau"
}, {"code": "1f1ec_1f1fe", "name": "Guyana"}, {
    "code": "1f1ed_1f1f0",
    "name": "Hong Kong SAR China"
}, {"code": "1f1ed_1f1f2", "name": "Heard & McDonald Islands"}, {
    "code": "1f1ed_1f1f3",
    "name": "Honduras"
}, {"code": "1f1ed_1f1f7", "name": "Croatia"}, {"code": "1f1ed_1f1f9", "name": "Haiti"}, {
    "code": "1f1ed_1f1fa",
    "name": "Hungary"
}, {"code": "1f1ee_1f1e8", "name": "Canary Islands"}, {
    "code": "1f1ee_1f1e9",
    "name": "Indonesia"
}, {"code": "1f1ee_1f1ea", "name": "Ireland"}, {"code": "1f1ee_1f1f1", "name": "Israel"}, {
    "code": "1f1ee_1f1f2",
    "name": "Isle of Man"
}, {"code": "1f1ee_1f1f3", "name": "India"}, {
    "code": "1f1ee_1f1f4",
    "name": "British Indian Ocean Territory"
}, {"code": "1f1ee_1f1f6", "name": "Iraq"}, {"code": "1f1ee_1f1f7", "name": "Iran"}, {
    "code": "1f1ee_1f1f8",
    "name": "Iceland"
}, {"code": "1f1ee_1f1f9", "name": "Italy"}, {"code": "1f1ef_1f1ea", "name": "Jersey"}, {
    "code": "1f1ef_1f1f2",
    "name": "Jamaica"
}, {"code": "1f1ef_1f1f4", "name": "Jordan"}, {"code": "1f1ef_1f1f5", "name": "Japan"}, {
    "code": "1f1f0_1f1ea",
    "name": "Kenya"
}, {"code": "1f1f0_1f1ec", "name": "Kyrgyzstan"}, {"code": "1f1f0_1f1ed", "name": "Cambodia"}, {
    "code": "1f1f0_1f1ee",
    "name": "Kiribati"
}, {"code": "1f1f0_1f1f2", "name": "Comoros"}, {
    "code": "1f1f0_1f1f3",
    "name": "St. Kitts & Nevis"
}, {"code": "1f1f0_1f1f5", "name": "North Korea"}, {
    "code": "1f1f0_1f1f7",
    "name": "South Korea"
}, {"code": "1f1f0_1f1fc", "name": "Kuwait"}, {"code": "1f1f0_1f1fe", "name": "Cayman Islands"}, {
    "code": "1f1f0_1f1ff",
    "name": "Kazakhstan"
}, {"code": "1f1f1_1f1e6", "name": "Laos"}, {"code": "1f1f1_1f1e7", "name": "Lebanon"}, {
    "code": "1f1f1_1f1e8",
    "name": "St. Lucia"
}, {"code": "1f1f1_1f1ee", "name": "Liechtenstein"}, {
    "code": "1f1f1_1f1f0",
    "name": "Sri Lanka"
}, {"code": "1f1f1_1f1f7", "name": "Liberia"}, {"code": "1f1f1_1f1f8", "name": "Lesotho"}, {
    "code": "1f1f1_1f1f9",
    "name": "Lithuania"
}, {"code": "1f1f1_1f1fa", "name": "Luxembourg"}, {"code": "1f1f1_1f1fb", "name": "Latvia"}, {
    "code": "1f1f1_1f1fe",
    "name": "Libya"
}, {"code": "1f1f2_1f1e6", "name": "Morocco"}, {"code": "1f1f2_1f1e8", "name": "Monaco"}, {
    "code": "1f1f2_1f1e9",
    "name": "Moldova"
}, {"code": "1f1f2_1f1ea", "name": "Montenegro"}, {"code": "1f1f2_1f1eb", "name": "St. Martin"}, {
    "code": "1f1f2_1f1ec",
    "name": "Madagascar"
}, {"code": "1f1f2_1f1ed", "name": "Marshall Islands"}, {
    "code": "1f1f2_1f1f0",
    "name": "Macedonia"
}, {"code": "1f1f2_1f1f1", "name": "Mali"}, {"code": "1f1f2_1f1f2", "name": "Myanmar (Burma)"}, {
    "code": "1f1f2_1f1f3",
    "name": "Mongolia"
}, {"code": "1f1f2_1f1f4", "name": "Macau SAR China"}, {
    "code": "1f1f2_1f1f5",
    "name": "Northern Mariana Islands"
}, {"code": "1f1f2_1f1f6", "name": "Martinique"}, {"code": "1f1f2_1f1f7", "name": "Mauritania"}, {
    "code": "1f1f2_1f1f8",
    "name": "Montserrat"
}, {"code": "1f1f2_1f1f9", "name": "Malta"}, {"code": "1f1f2_1f1fa", "name": "Mauritius"}, {
    "code": "1f1f2_1f1fb",
    "name": "Maldives"
}, {"code": "1f1f2_1f1fc", "name": "Malawi"}, {"code": "1f1f2_1f1fd", "name": "Mexico"}, {
    "code": "1f1f2_1f1fe",
    "name": "Malaysia"
}, {"code": "1f1f2_1f1ff", "name": "Mozambique"}, {"code": "1f1f3_1f1e6", "name": "Namibia"}, {
    "code": "1f1f3_1f1e8",
    "name": "New Caledonia"
}, {"code": "1f1f3_1f1ea", "name": "Niger"}, {"code": "1f1f3_1f1eb", "name": "Norfolk Island"}, {
    "code": "1f1f3_1f1ec",
    "name": "Nigeria"
}, {"code": "1f1f3_1f1ee", "name": "Nicaragua"}, {"code": "1f1f3_1f1f1", "name": "Netherlands"}, {
    "code": "1f1f3_1f1f4",
    "name": "Norway"
}, {"code": "1f1f3_1f1f5", "name": "Nepal"}, {"code": "1f1f3_1f1f7", "name": "Nauru"}, {
    "code": "1f1f3_1f1fa",
    "name": "Niue"
}, {"code": "1f1f3_1f1ff", "name": "New Zealand"}, {"code": "1f1f4_1f1f2", "name": "Oman"}, {
    "code": "1f1f5_1f1e6",
    "name": "Panama"
}, {"code": "1f1f5_1f1ea", "name": "Peru"}, {"code": "1f1f5_1f1eb", "name": "French Polynesia"}, {
    "code": "1f1f5_1f1ec",
    "name": "Papua New Guinea"
}, {"code": "1f1f5_1f1ed", "name": "Philippines"}, {"code": "1f1f5_1f1f0", "name": "Pakistan"}, {
    "code": "1f1f5_1f1f1",
    "name": "Poland"
}, {"code": "1f1f5_1f1f2", "name": "St. Pierre & Miquelon"}, {
    "code": "1f1f5_1f1f3",
    "name": "Pitcairn Islands"
}, {"code": "1f1f5_1f1f7", "name": "Puerto Rico"}, {
    "code": "1f1f5_1f1f8",
    "name": "Palestinian Territories"
}, {"code": "1f1f5_1f1f9", "name": "Portugal"}, {"code": "1f1f5_1f1fc", "name": "Palau"}, {
    "code": "1f1f5_1f1fe",
    "name": "Paraguay"
}, {"code": "1f1f6_1f1e6", "name": "Qatar"}, {"code": "1f1f7_1f1ea", "name": "Réunion"}, {
    "code": "1f1f7_1f1f4",
    "name": "Romania"
}, {"code": "1f1f7_1f1f8", "name": "Serbia"}, {"code": "1f1f7_1f1fa", "name": "Russia"}, {
    "code": "1f1f7_1f1fc",
    "name": "Rwanda"
}, {"code": "1f1f8_1f1e6", "name": "Saudi Arabia"}, {
    "code": "1f1f8_1f1e7",
    "name": "Solomon Islands"
}, {"code": "1f1f8_1f1e8", "name": "Seychelles"}, {"code": "1f1f8_1f1e9", "name": "Sudan"}, {
    "code": "1f1f8_1f1ea",
    "name": "Sweden"
}, {"code": "1f1f8_1f1ec", "name": "Singapore"}, {"code": "1f1f8_1f1ed", "name": "St. Helena"}, {
    "code": "1f1f8_1f1ee",
    "name": "Slovenia"
}, {"code": "1f1f8_1f1ef", "name": "Svalbard & Jan Mayen"}, {
    "code": "1f1f8_1f1f0",
    "name": "Slovakia"
}, {"code": "1f1f8_1f1f1", "name": "Sierra Leone"}, {
    "code": "1f1f8_1f1f2",
    "name": "San Marino"
}, {"code": "1f1f8_1f1f3", "name": "Senegal"}, {"code": "1f1f8_1f1f4", "name": "Somalia"}, {
    "code": "1f1f8_1f1f7",
    "name": "Suriname"
}, {"code": "1f1f8_1f1f8", "name": "South Sudan"}, {
    "code": "1f1f8_1f1f9",
    "name": "São Tomé & Príncipe"
}, {"code": "1f1f8_1f1fb", "name": "El Salvador"}, {
    "code": "1f1f8_1f1fd",
    "name": "Sint Maarten"
}, {"code": "1f1f8_1f1fe", "name": "Syria"}, {"code": "1f1f8_1f1ff", "name": "Swaziland"}, {
    "code": "1f1f9_1f1e6",
    "name": "Tristan da Cunha"
}, {"code": "1f1f9_1f1e8", "name": "Turks & Caicos Islands"}, {
    "code": "1f1f9_1f1e9",
    "name": "Chad"
}, {"code": "1f1f9_1f1eb", "name": "French Southern Territories"}, {
    "code": "1f1f9_1f1ec",
    "name": "Togo"
}, {"code": "1f1f9_1f1ed", "name": "Thailand"}, {"code": "1f1f9_1f1ef", "name": "Tajikistan"}, {
    "code": "1f1f9_1f1f0",
    "name": "Tokelau"
}, {"code": "1f1f9_1f1f1", "name": "Timor-Leste"}, {
    "code": "1f1f9_1f1f2",
    "name": "Turkmenistan"
}, {"code": "1f1f9_1f1f3", "name": "Tunisia"}, {"code": "1f1f9_1f1f4", "name": "Tonga"}, {
    "code": "1f1f9_1f1f7",
    "name": "Turkey"
}, {"code": "1f1f9_1f1f9", "name": "Trinidad & Tobago"}, {
    "code": "1f1f9_1f1fb",
    "name": "Tuvalu"
}, {"code": "1f1f9_1f1fc", "name": "Taiwan"}, {"code": "1f1f9_1f1ff", "name": "Tanzania"}, {
    "code": "1f1fa_1f1e6",
    "name": "Ukraine"
}, {"code": "1f1fa_1f1ec", "name": "Uganda"}, {
    "code": "1f1fa_1f1f2",
    "name": "U.S. Outlying Islands"
}, {"code": "1f1fa_1f1f3", "name": "United Nations"}, {
    "code": "1f1fa_1f1f8",
    "name": "United States"
}, {"code": "1f1fa_1f1fe", "name": "Uruguay"}, {"code": "1f1fa_1f1ff", "name": "Uzbekistan"}, {
    "code": "1f1fb_1f1e6",
    "name": "Vatican City"
}, {"code": "1f1fb_1f1e8", "name": "St. Vincent & Grenadines"}, {
    "code": "1f1fb_1f1ea",
    "name": "Venezuela"
}, {"code": "1f1fb_1f1ec", "name": "British Virgin Islands"}, {
    "code": "1f1fb_1f1ee",
    "name": "U.S. Virgin Islands"
}, {"code": "1f1fb_1f1f3", "name": "Vietnam"}, {"code": "1f1fb_1f1fa", "name": "Vanuatu"}, {
    "code": "1f1fc_1f1eb",
    "name": "Wallis & Futuna"
}, {"code": "1f1fc_1f1f8", "name": "Samoa"}, {"code": "1f1fd_1f1f0", "name": "Kosovo"}, {
    "code": "1f1fe_1f1ea",
    "name": "Yemen"
}, {"code": "1f1fe_1f1f9", "name": "Mayotte"}, {"code": "1f1ff_1f1e6", "name": "South Africa"}, {
    "code": "1f1ff_1f1f2",
    "name": "Zambia"
}, {"code": "1f1ff_1f1fc", "name": "Zimbabwe"}];

// quick lookup. Is a message/comment a reaction?
// console.log('91-emoji-info.js: initialized is_emoji hash') ;
var is_emoji = {} ;
(function() {
    var i, hex_codes, symbols, j ;
    for (i=0 ; i<emoji_names.length ; i++) {
        hex_codes = emoji_names[i].code.split('_') ;
        symbols = [] ;
        for (j=0 ; j<hex_codes.length ; j++) symbols.push(parseInt(hex_codes[j], 16)) ;
        is_emoji[punycode.ucs2.encode(symbols)] = emoji_names[i].name || 'No title' ;
    }
})() ;