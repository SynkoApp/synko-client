import emojiUnicode from 'emoji-unicode';
import emojis from './emojis';
import { emojify, random } from 'node-emoji';
import { renderToString } from 'react-dom/server';

export default function(text, isOnlyEmojis) {
    return emojify(text, function(name) {
        if(name == "random") {
            let randomEmoji = random();
            let unicode = emojiUnicode(randomEmoji.emoji);
            let emoji = emojis.find(e => e.code == unicode+".webp");
            if(emoji) {
                return renderToString(<img draggable={false} className={`inline-block ${isOnlyEmojis?"":"w-5"}`} alt={randomEmoji.emoji} src={`./emojis/${emoji?.category}/${emoji?.code}`} />);
            } else {
                return renderToString(<span className={`${isOnlyEmojis?"text-2xl":""}`}>{randomEmoji.emoji}</span>);
            }
        }
        return name;
    }, function(code, name) {
        let unicode = emojiUnicode(code);
        let emoji = emojis.find(e => e.code == unicode+".webp");
        if(emoji) {
            return renderToString(<img draggable={false} className={`inline-block ${isOnlyEmojis?"":"w-5"}`} alt={code} src={`./emojis/${emoji?.category}/${emoji?.code}`} />);
        } else {
            return renderToString(<span className={`${isOnlyEmojis?"text-2xl":""}`}>{code}</span>);
        }
    });
}