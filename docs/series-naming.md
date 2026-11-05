# Image series filenames

End each image basename with `_s` followed by **1–4 digits**, immediately before
the extension: `brain_s1.tif`, `brain_s01.tif`, or `brain_s0001.tif`.
Pyramids with a compound extension such as `brain_s0001.tif.dzip` are supported.
Use only one section identifier per filename so downstream tools match it
unambiguously.

Each numeric section value must be unique within the series. Prefixes, file
extensions, and leading zeros do not distinguish sections: `a_s21.tif` and
`b_s0021.png` overlap. Zero is valid. Gaps and unordered selections are allowed;
for example, sections `01`, `02`, `03`, `10` form a valid series.

The Add/Edit Series dialog validates the entire selection, including files added
in separate drops, checks the existing series before allowing submission, and
checks again immediately before upload.
An existing filename also occupies its section number. Remove conflicting files
from the selection or rename them before upload. A failed existing-image lookup
blocks submission and offers a retry. Raw image listings include all pages.

The series image table displays the parsed section or a naming error for every
image. Invalid or overlapping names block conversion until corrected. Removing a
file from the upload list also removes it from the upload queue.

These checks apply to image series creation/editing and conversion. Custom
segmentation uploads have a separate workflow.
