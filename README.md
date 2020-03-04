# TED-Q: TED Talks and the Questions they Evoke #

## Contents of this repository ##

See further below for an explanation of the structure of these .csv files.

- TED-Q_elicitation.csv: Data from our elicitation phase: evoked questions and their (non-)answers.
- TED-Q_comparison_raw.csv: Data from our comparison phase: how related are the evoked questions to each other -- individual annotator's judgments per question pair.
- TED-Q_comparison_aggregated.csv: Data from our comparison phase, aggregated annotator's judgments per question pair (mean).

## Download the source texts ##

TED-Q provides an additional layer of annotations to the existing TED-MDB dataset. The source texts are not included in the current repository; download them here:

https://github.com/MurathanKurfali/Ted-MDB-Annotations

Or here (forked):

https://github.com/amore-upf/Ted-MDB-Annotations

-------------------------------

## Attribution ##

If you use this resource, please cite our LREC paper:

    @inproceedings{westera2019lrec,
      title={TED-Q: TED Talks and the Questions they Evoke},
      author={Matthijs Westera and Laia Mayol and Hannah Rohde},
      booktitle = "Proceedings of the Twelfth International Conference on Language Resources and Evaluation (LREC'2020)",
      year = 	 "2020",
      month = 	 "May",
      date =     "13-15",
      address =  "Marseille, France",
      publisher = "European Language Resource Association (ELRA)",
    }

And consider citing also the authors of the TED-MDB dataset, whose source texts we used:

    @article{zeyrek2019ted,
      title={TED Multilingual Discourse Bank (TED-MDB): a parallel corpus annotated in the PDTB style},
      author={Zeyrek, Deniz and Mendes, Amalia and Grishina, Yulia and Kurfali, Murathan and Gibbon, Samuel and Ogrodniczuk,    Maciej},
      journal={Language Resources and Evaluation},
      pages={1--38},
      year={2019},
      publisher={Springer}
    }

    @inproceedings{zeyrek2018multilingual,
      title={Multilingual Extension of PDTB-Style Annotation: The Case of TED Multilingual Discourse Bank.},
      author={Zeyrek, Deniz and Mendes, Amalia and Kurfali, Murathan},
      booktitle={LREC},
      year={2018}
    }

-------------------------------

## Structure of the .csv files ##

### TED-Q_elicitation.csv: ###

- excerpt_number: the number of excerpts (up to 6) this annotator has seen including the current one.

- chunk_number: the number of chunks (up to 8) this annotator has seen within this excerpt, including the current one.

- worker: a made-up name uniquely identifying the annotator.

- type: the type of annotation, among 'question', 'answer' ('answered' score >= 3), 'non-answer' ('answered' score <= 2), or 'evaluation' (some meta-questions at the end of each fragment).

- content (for 'question'/'answer' type annotations only): the question/answer as formulated by the annotator in their own words.

- answered: for 'answer'/'non-answer' type annotations, the degree to which it provided an answer to the given question ('prior_question'); for 'question' type annotations, the maximal degree to which it was answered.

- highlight (for 'question'/'answer') type annotations only): the words selected by the person as either triggering the question or providing the answer.

- prior_question (for 'answer'/'non-answer' type annotations only): annotation id of the question to which the current chunk provides a (non-)answer.

- best_answer (for 'question' type annotations only): annotation id of its best answer.

- coherence/naturalness/comment (for 'evaluation' type annotations only): after every fragment (around 8 chunks per fragment) we asked participants whether the text was coherent and natural (scales from 1 to 5), and provided an open text field for comments.

- relatedness (for 'question' type annotations only): how related a question is, on average, to other questions elicited by the same chunk (according to aggregated verification data).

- source: identifier of the source text, assuming the directory structure in the Ted-MDB-Annotations github repo (see URL above).

- chunk_start/chunk_end: the start/end position (by number of characters) in the source text of the chunk (two sentences) presented to the annotator when eliciting the annotation.

- highlight_start/highlight_end (for 'question'/'answer' type annotations only): the start/end position (by number of characters) in the source text of the phrase highlighted by the annotator (depending on 'type': the trigger of the question, or the part providing the answer)

### TED-Q_comparison_raw.csv ###

We asked annotators to judge how related two questions were given the context that evoked them.

- workerid: anonymized identifier of the annotator

- snippet: presented to annotators for judging question relatedness in context, roughly two sentences from the source text, including the chunk that evoked the questions to be judged.

- target_question: the target question

- comparison_question: the question which they were asked to compare to the target question

- relatedness: how related they judged the two questions to be, from 0 (not closely related) to 3 (equivalent)

- target_question_id: annotation id of the target question (for linking to elicitation data)

- comparison_question_id: annotation id of the comparison question (for linking to elicitation data)

### TED-Q_comparison_aggregated.csv ###

We aggregated relatedness judgments by taking the mean, conflating target/comparison pairs in either order (making for ~6 judgments per pair):

- question1_id / question2_id: annotation id of the questions (for linking to elicitation data).

- snippet: the snippet of text against which question relatedness was judged (as above).

- question1 / question2: the questions in plain text.

- relatedness_mean: mean of the individual judgments for this pair.

- relatedness_count: how many individual judgments for this pair.

- relatedness_list: list containing the individual judgments for this pair.

- relatedness_std: standard deviation among the individual judgments for this pair.
