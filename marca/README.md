# Marca

## logo-original.jpg

Foto do emblema da loja, 227x165, tirada de um broche cromado. **Não é um
arquivo de logo** — é uma fotografia, com fundo em degradê e ruído de JPEG.

Foi daqui que saiu o ícone do aplicativo, mas só o brasão "TB": o boi tem
traço fino demais e, no tamanho em que o ícone aparece (16 a 40 pixels),
vira um borrão cinza. Dá para conferir reduzindo a foto a 40px.

## Se um dia aparecer o arquivo original

Vale pedir à cliente o arquivo de origem — `.svg`, `.ai`, `.eps`, `.pdf` ou
um `.png` grande com fundo transparente. Com ele dá para usar o boi inteiro,
que é o que dá personalidade à marca, e não só as iniciais.

## Como o ícone é gerado

`client/public/favicon.svg` tem as letras em curvas, não em `<text>`: um
favicon com `<text>` depende da fonte instalada em cada computador, e sairia
diferente conforme quem abre a loja.

`client/public/apple-touch-icon.png` existe à parte porque o iOS ignora SVG
no ícone da tela inicial, e não respeita transparência — por isso ele tem o
fundo vermelho da loja em vez de fundo transparente.
