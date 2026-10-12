#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成 assets/图说.ico（给桌面快捷方式和发布用）。

画法：朱红圆角方块 + 三条带圆点的白条，意思是"一条条要点变成一张图"。
为什么不用"图"字：汉字笔画多，缩到 16×16 就糊成一团；
几何图形在任何尺寸下都认得出来，而快捷方式图标最常出现的尺寸恰恰很小。
"""
import os

from PIL import Image, ImageDraw

根目录 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
输出 = os.path.join(根目录, "assets", "图说.ico")
底色 = (168, 50, 45, 255)      # 朱红 #A8322D
条色 = (247, 243, 234, 255)    # 宣纸 #F7F3EA
尺寸清单 = [256, 128, 64, 48, 32, 16]
条长比例 = [0.50, 0.36, 0.44]  # 三条长短不一，看起来才像"内容"而不是"菜单"


def 画一张(边长):
    图 = Image.new("RGBA", (边长, 边长), (0, 0, 0, 0))
    笔 = ImageDraw.Draw(图)
    笔.rounded_rectangle([0, 0, 边长 - 1, 边长 - 1], radius=int(边长 * 0.22), fill=底色)
    条高 = 边长 * 0.088
    点r = 边长 * 0.052
    左 = 边长 * 0.25
    起y = 边长 * 0.30
    行距 = 边长 * 0.205
    for i, 比例 in enumerate(条长比例):
        y = 起y + i * 行距
        笔.ellipse([左 - 点r, y + 条高 / 2 - 点r, 左 + 点r, y + 条高 / 2 + 点r], fill=条色)
        笔.rounded_rectangle(
            [左 + 点r * 3.4, y, 左 + 点r * 3.4 + 边长 * 比例, y + 条高],
            radius=条高 / 2,
            fill=条色,
        )
    return 图


def 主函数():
    画一张(256).save(输出, format="ICO", sizes=[(s, s) for s in 尺寸清单])
    print("已写出 %s（%d 字节）" % (输出, os.path.getsize(输出)))


if __name__ == "__main__":
    主函数()
