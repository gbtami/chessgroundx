// place for util functions either coming from pychess and/or also useful in pychess or just
// not part of original chessground and put here instead of in ./utils.ts to minimize merge conflicts

/**
 * Count given letter occurences in a string
 * @param str
 * @param letter
 * @param uppercase
 * @returns {number}
 */
export function lc(str: string, letter: string, uppercase: boolean): number {
    if (uppercase)
        letter = letter.toUpperCase();
    else
        letter = letter.toLowerCase();
    let letterCount = 0;
    for (let position = 0; position < str.length; position++)
        if (str.charAt(position) === letter)
            letterCount += 1;
    return letterCount;
}