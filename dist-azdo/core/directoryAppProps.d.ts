/**
 * Parses JSON that may have comments or a byte order mark.
 */
export declare function parseTolerant(content: string): unknown;
/**
 * Resolves `directory.app.props.json` for the properties Ninja consumes, in place. It fills a
 * property `app.json` omits from the file's `properties` (`app.json` wins), and resolves `$(...)`
 * tokens in `app.json` values against its `variables`. A malformed props file is ignored.
 */
export declare function applyDirectoryAppProps(appJsonPath: string, parsedApp: any): void;
//# sourceMappingURL=directoryAppProps.d.ts.map