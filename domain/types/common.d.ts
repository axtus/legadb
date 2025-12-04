type ALL = string | number | boolean | bigint | null | POJO | Date | ALL[];
type POJO = { [key: string]: ALL };
