#!/usr/bin/env bash
# GitHub CLI(gh)로 이슈 라벨 생성. 저장소 폴더에서 실행: bash scripts/setup_labels.sh
set -e
gh label create T1       --color 1f6feb --description "트랙 1: 기능 분리·자원 태깅" --force
gh label create T2       --color 2da44e --description "트랙 2: 상속안 추천·공백 분석" --force
gh label create contract --color d4a72c --description "연결 지점 계약 문서" --force
gh label create data     --color 8250df --description "데이터 수집·정제" --force
gh label create docs     --color 6e7781 --description "보고서·문서" --force
gh label create feature  --color 0969da --description "기능 추가 (10/22 이후 금지)" --force
gh label create task     --color ededed --description "계획상 작업" --force
gh label create bug      --color cf222e --description "버그" --force
