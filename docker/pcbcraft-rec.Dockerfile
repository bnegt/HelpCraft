# Records PCBCraft's desktop UI headless: Xvfb + Mesa llvmpipe (WGPU_BACKEND=gl; the Vulkan surface fails on Xvfb) + ffmpeg x11grab.
# The pcbcraft binaries come from the host (bind mount); Arch matches the host's glibc.
FROM archlinux:latest
RUN pacman -Syu --noconfirm --needed xorg-server-xvfb vulkan-swrast vulkan-icd-loader mesa \
      libxkbcommon-x11 libx11 libxcursor libxrandr libxi ffmpeg python ttf-dejavu noto-fonts xorg-xdpyinfo xdotool \
 && pacman -Scc --noconfirm
ENV VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.json WGPU_BACKEND=gl
